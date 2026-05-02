from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import app
from plotting import PlotOptions


def test_version_endpoint_and_cache_headers():
    client = TestClient(app.app)

    index_response = client.get("/")
    assert index_response.status_code == 200
    assert index_response.headers["cache-control"].startswith("no-store")
    assert f"/static/style.css?v={app.ASSET_VERSION}" in index_response.text
    assert f"/static/app.js?v={app.ASSET_VERSION}" in index_response.text

    static_response = client.get(f"/static/style.css?v={app.ASSET_VERSION}")
    assert static_response.status_code == 200
    assert "immutable" in static_response.headers["cache-control"]

    version_response = client.get("/api/version")
    assert version_response.status_code == 200
    payload = version_response.json()
    assert payload["version"] == app.APP_VERSION
    assert payload["formats"]["project"]["schemaVersion"] == 2
    assert payload["formats"]["exportManifest"]["schemaVersion"] == 1


def test_optional_numbers_keep_defaults_for_empty_values():
    assert app.optional_float("", 1.5) == 1.5
    assert app.optional_float(None, 2.5) == 2.5
    assert app.optional_float("3.25") == 3.25
    assert app.optional_int("", 7) == 7
    assert app.optional_int(None, 8) == 8
    assert app.optional_int("9", 0) == 9


def test_parse_aspect_ratio_accepts_ratio_syntax():
    assert app.parse_aspect_ratio("16:9") == pytest.approx(16 / 9)
    assert app.parse_aspect_ratio("1.6") == pytest.approx(1.6)


def test_parse_aspect_ratio_rejects_invalid_values():
    with pytest.raises(HTTPException):
        app.parse_aspect_ratio("0")
    with pytest.raises(HTTPException):
        app.parse_aspect_ratio("bad")


def test_validate_ranges_rejects_inverted_and_invalid_log_ranges():
    options = PlotOptions(x_min=2.0, x_max=1.0)
    with pytest.raises(ValueError, match="X min"):
        app.validate_ranges(options)

    options = PlotOptions(x_scale="log", x_min=0.0)
    with pytest.raises(ValueError, match="Log X"):
        app.validate_ranges(options)

    options = PlotOptions(y_scale="log", y_min=-1.0)
    with pytest.raises(ValueError, match="Log Y"):
        app.validate_ranges(options)


def test_fit_required_points_for_supported_models():
    assert app.fit_required_points("pol0") == 1
    assert app.fit_required_points("pol6") == 7
    assert app.fit_required_points("linear") == 2
    assert app.fit_required_points("quadratic") == 3
    assert app.fit_required_points("gaussian") == 3


def test_safe_name_replaces_path_unsafe_characters():
    assert app.safe_name('dir/name:with*bad?"chars|') == "dir_name_with_bad_chars_"


def test_export_manifest_contains_reproducibility_metadata():
    histograms = [
        {"path": "dir/h1", "kind": "TH1", "className": "TH1D"},
        {"path": "h2", "kind": "TH2", "className": "TH2F"},
    ]
    manifest = app.export_manifest(
        Path("sample.root"),
        "png",
        {"dpi": "300", "normalization": "raw"},
        {"dir/h1": {"lineColor": "#ff0000"}},
        histograms,
    )

    assert manifest["schema"] == app.EXPORT_MANIFEST_SCHEMA
    assert manifest["schemaVersion"] == app.EXPORT_MANIFEST_SCHEMA_VERSION
    assert manifest["app"]["version"] == app.APP_VERSION
    assert manifest["source"]["rootFileName"] == "sample.root"
    assert manifest["format"] == "png"
    assert manifest["objectCount"] == 2
    assert manifest["objects"][0]["output"] == "dir_h1.png"
    assert manifest["objects"][0]["hasObjectSettings"] is True
    assert manifest["objects"][0]["settings"]["lineColor"] == "#ff0000"
    assert manifest["objects"][1]["hasObjectSettings"] is False
