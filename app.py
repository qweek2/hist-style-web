from pathlib import Path
from uuid import uuid4
from io import BytesIO
from datetime import datetime, timezone
from threading import Lock
import json
import os
import re
import time
import zipfile

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
import numpy as np

from plotting import PlotOptions, plot_kind, plot_metadata, profile2d_numpy, profile_numpy, render_compare_th1, render_histogram, render_panel
from root_reader import get_histogram, histogram_summary, list_histograms, llm_export_payload, object_info


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
STATIC_DIR = BASE_DIR / "static"
APP_NAME = "Histogram Style Web"
APP_VERSION = os.getenv("APP_VERSION", "0.2.0")
PROJECT_SCHEMA = "hist-style-web.project"
PROJECT_SCHEMA_VERSION = 2
STYLE_SCHEMA = "hist-style-web.style"
STYLE_SCHEMA_VERSION = 1
EXPORT_MANIFEST_SCHEMA = "hist-style-web.export-manifest"
EXPORT_MANIFEST_SCHEMA_VERSION = 1
LLM_EXPORT_SCHEMA = "hist-style-web.llm-export"
LLM_EXPORT_SCHEMA_VERSION = 1
ASSET_VERSION = os.getenv("ASSET_VERSION", APP_VERSION)
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "200")) * 1024 * 1024
UPLOAD_TTL_SECONDS = int(os.getenv("UPLOAD_TTL_SECONDS", "3600"))
ALLOW_LOCAL_FILE_OPEN = os.getenv("ALLOW_LOCAL_FILE_OPEN", "0" if os.getenv("RENDER") else "1") == "1"

UPLOAD_DIR.mkdir(exist_ok=True)

class CacheControlledStaticFiles(StaticFiles):
    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.mount("/static", CacheControlledStaticFiles(directory=STATIC_DIR), name="static")

FILES: dict[str, Path] = {}
PLOT_LOCK = Lock()


@app.get("/")
def index():
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    html = html.replace("__APP_VERSION__", APP_VERSION)
    html = html.replace("__ASSET_VERSION__", ASSET_VERSION)
    html = html.replace("__PROJECT_SCHEMA__", PROJECT_SCHEMA)
    html = html.replace("__PROJECT_SCHEMA_VERSION__", str(PROJECT_SCHEMA_VERSION))
    return HTMLResponse(
        content=html,
        headers={
            "Cache-Control": "no-store, max-age=0",
            "Pragma": "no-cache",
        },
    )


@app.get("/api/version")
def version():
    return app_metadata()


@app.post("/api/upload")
async def upload_root_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".root"):
        raise HTTPException(status_code=400, detail="Upload a .root file")

    cleanup_uploads()
    file_id = uuid4().hex
    target = UPLOAD_DIR / f"{file_id}.root"
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File is larger than {MAX_UPLOAD_BYTES // 1024 // 1024} MB")
    target.write_bytes(content)
    FILES[file_id] = target

    try:
        histograms = list_histograms(target)
    except Exception as exc:
        target.unlink(missing_ok=True)
        FILES.pop(file_id, None)
        raise HTTPException(status_code=400, detail=f"Cannot read ROOT file: {exc}") from exc

    return {"fileId": file_id, "histograms": histograms}


@app.post("/api/open-local-root")
def open_local_root_file(payload: dict):
    if not ALLOW_LOCAL_FILE_OPEN:
        raise HTTPException(status_code=403, detail="Opening local ROOT paths is disabled on this server")

    raw_path = str(payload.get("path") or "").strip()
    if not raw_path:
        raise HTTPException(status_code=400, detail="ROOT file path is empty")

    try:
        root_path = Path(raw_path).expanduser().resolve(strict=True)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"ROOT file path does not exist: {raw_path}") from exc

    if root_path.suffix.lower() != ".root":
        raise HTTPException(status_code=400, detail="Local path must point to a .root file")
    if not root_path.is_file():
        raise HTTPException(status_code=400, detail="Local ROOT path is not a file")

    file_id = uuid4().hex
    FILES[file_id] = root_path

    try:
        histograms = list_histograms(root_path)
    except Exception as exc:
        FILES.pop(file_id, None)
        raise HTTPException(status_code=400, detail=f"Cannot read ROOT file: {exc}") from exc

    return {
        "fileId": file_id,
        "histograms": histograms,
        "rootFileName": root_path.name,
        "rootFilePath": str(root_path),
    }


@app.get("/api/files/{file_id}/histograms")
def histograms(file_id: str):
    root_path = file_path(file_id)
    try:
        return {"histograms": list_histograms(root_path)}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot read ROOT file: {exc}") from exc


@app.get("/api/files/{file_id}/plot")
def plot(
    file_id: str,
    path: str,
    dpi: int = Query(default=200, ge=100, le=400),
    aspect_ratio: str = "16:10",
    x_scale: str = Query(default="linear", pattern="^(linear|log)$"),
    y_scale: str = Query(default="linear", pattern="^(linear|log)$"),
    z_scale: str = Query(default="linear", pattern="^(linear|log)$"),
    colormap: str = Query(default="white-blue", pattern="^(white-blue|white-red|viridis|magma|gray)$"),
    normalization: str = Query(default="raw", pattern="^(raw|area|max|bin_width)$"),
    show_errors: bool = True,
    show_legend: bool = True,
    uncertainty_band: bool = False,
    line_style: str = Query(default="solid", pattern="^(solid|dashed|dashdot|dotted)$"),
    marker_style: str = Query(default="none", pattern="^(none|circle|square|triangle|diamond)$"),
    line_alpha: float = Query(default=1.0, ge=0.05, le=1.0),
    fit_enabled: bool = False,
    fit_model: str = Query(default="gaussian", pattern="^(gaussian|exponential|linear|quadratic|cubic|pol[0-6])$"),
    fit_x_min: float | None = None,
    fit_x_max: float | None = None,
    include_summary: bool = False,
    font_family: str = "Arial, Helvetica, Liberation Sans, DejaVu Sans",
    figure_facecolor: str = Query(default="#ffffff", pattern=r"^#[0-9a-fA-F]{6}$"),
    axes_facecolor: str = Query(default="#ffffff", pattern=r"^#[0-9a-fA-F]{6}$"),
    text_color: str = Query(default="#111827", pattern=r"^#[0-9a-fA-F]{6}$"),
    axis_color: str = Query(default="#111827", pattern=r"^#[0-9a-fA-F]{6}$"),
    tick_direction: str = Query(default="out", pattern="^(in|out|inout)$"),
    line_width: float = Query(default=2.0, ge=0.5, le=8.0),
    line_color: str = Query(default="#1f77b4", pattern=r"^#[0-9a-fA-F]{6}$"),
    title: str | None = None,
    x_label: str | None = None,
    y_label: str | None = None,
    title_font_size: int = Query(default=13, ge=6, le=40),
    label_font_size: int = Query(default=11, ge=6, le=40),
    tick_font_size: int = Query(default=10, ge=6, le=40),
    x_min: float | None = None,
    x_max: float | None = None,
    y_min: float | None = None,
    y_max: float | None = None,
    z_min: float | None = None,
    z_max: float | None = None,
    image_format: str = Query(default="png", pattern="^(png|pdf|svg)$"),
):
    root_path = file_path(file_id)
    options = PlotOptions(
        dpi=dpi,
        aspect_ratio=parse_aspect_ratio(aspect_ratio),
        x_scale=x_scale,
        y_scale=y_scale,
        z_scale=z_scale,
        colormap=colormap,
        normalization=normalization,
        show_errors=show_errors,
        show_legend=show_legend,
        uncertainty_band=uncertainty_band,
        line_style=line_style,
        marker_style=marker_style,
        line_alpha=line_alpha,
        fit_enabled=fit_enabled,
        fit_model=fit_model,
        fit_x_min=fit_x_min,
        fit_x_max=fit_x_max,
        include_summary=include_summary,
        summary_text=summary_line(root_path, path) if include_summary else None,
        font_family=font_family,
        figure_facecolor=figure_facecolor,
        axes_facecolor=axes_facecolor,
        text_color=text_color,
        axis_color=axis_color,
        tick_direction=tick_direction,
        line_width=line_width,
        line_color=line_color,
        title=empty_to_none(title),
        x_label=empty_to_none(x_label),
        y_label=empty_to_none(y_label),
        title_font_size=title_font_size,
        label_font_size=label_font_size,
        tick_font_size=tick_font_size,
        x_min=x_min,
        x_max=x_max,
        y_min=y_min,
        y_max=y_max,
        z_min=z_min,
        z_max=z_max,
    )
    try:
        hist = get_histogram(root_path, path)
        validate_plot_request(hist, options)
        with PLOT_LOCK:
            image = render_histogram(hist, options, image_format)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(content=image, media_type=media_type(image_format))


@app.get("/api/files/{file_id}/summary")
def summary(file_id: str, path: str):
    root_path = file_path(file_id)
    try:
        return histogram_summary(root_path, path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/files/{file_id}/plot-metadata")
def metadata(file_id: str, payload: dict):
    root_path = file_path(file_id)
    hist_path = payload.get("path")
    if not hist_path:
        raise HTTPException(status_code=400, detail="Object path is required")
    try:
        obj = get_histogram(root_path, hist_path)
        options = options_from_settings(payload.get("settings", {}))
        validate_plot_request(obj, options)
        with PLOT_LOCK:
            return plot_metadata(obj, options)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/files/{file_id}/info")
def info(file_id: str, path: str):
    root_path = file_path(file_id)
    try:
        return object_info(root_path, path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/files/{file_id}/analysis")
def analysis(file_id: str, payload: dict):
    root_path = file_path(file_id)
    hist_path = payload.get("path")
    if not hist_path:
        raise HTTPException(status_code=400, detail="Object path is required")

    try:
        obj = get_histogram(root_path, hist_path)
        options = options_from_settings(payload.get("settings", {}))
        x_min = optional_float(payload.get("xMin"))
        x_max = optional_float(payload.get("xMax"))
        if x_min is not None and x_max is not None and x_min >= x_max:
            raise ValueError("Analysis X min must be smaller than Analysis X max")
        return analysis_payload(obj, options, x_min, x_max)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/files/{file_id}/export")
def export_all(file_id: str, payload: dict):
    root_path = file_path(file_id)
    image_format = payload.get("format", "png")
    if image_format not in {"png", "pdf", "svg"}:
        raise HTTPException(status_code=400, detail="Format must be png, pdf, or svg")

    global_settings = payload.get("globalSettings", {})
    hist_settings = payload.get("histSettings", {})

    try:
        histograms = list_histograms(root_path)
        manifest = export_manifest(root_path, image_format, global_settings, hist_settings, histograms)
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
            for hist_info in histograms:
                path = hist_info["path"]
                settings = {**global_settings, **hist_settings.get(path, {})}
                options = options_from_settings(settings)
                if options.include_summary:
                    options.summary_text = summary_line(root_path, path)
                hist = get_histogram(root_path, path)
                with PLOT_LOCK:
                    image = render_histogram(hist, options, image_format)
                archive.writestr(f"{safe_name(path)}.{image_format}", image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="histograms.zip"'},
    )


@app.post("/api/files/{file_id}/llm-export")
def export_for_llm(file_id: str, payload: dict):
    root_path = file_path(file_id)
    paths = payload.get("paths", [])
    if not isinstance(paths, list) or not paths:
        raise HTTPException(status_code=400, detail="Select at least one object")

    known_paths = {item["path"] for item in list_histograms(root_path)}
    missing = [path for path in paths if path not in known_paths]
    if missing:
        raise HTTPException(status_code=400, detail=f"Object not found: {missing[0]}")

    try:
        return llm_export_payload(root_path, paths)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/files/{file_id}/compare")
def compare(file_id: str, payload: dict):
    root_path = file_path(file_id)
    image_format = payload.get("format", "png")
    if image_format not in {"png", "pdf", "svg"}:
        raise HTTPException(status_code=400, detail="Format must be png, pdf, or svg")

    paths = payload.get("paths", [])
    labels = payload.get("labels", [])
    colors = payload.get("colors", [])
    styles = payload.get("styles", [])
    markers = payload.get("markers", [])
    alphas = payload.get("alphas", [])
    if len(paths) < 2:
        raise HTTPException(status_code=400, detail="Select at least two TH1/TProfile objects")

    try:
        options = options_from_settings(payload.get("settings", {}))
        histograms = []
        for index, path in enumerate(paths):
            hist = get_histogram(root_path, path)
            if plot_kind(hist) not in {"TH1", "TProfile"}:
                raise HTTPException(status_code=400, detail="Compare supports TH1 and TProfile only")
            label = labels[index] if index < len(labels) and labels[index] else path
            color = colors[index] if index < len(colors) and colors[index] else None
            style = styles[index] if index < len(styles) and styles[index] else None
            marker = markers[index] if index < len(markers) and markers[index] else None
            alpha = optional_float(alphas[index]) if index < len(alphas) and alphas[index] != "" else None
            histograms.append((label, hist, color, style, marker, alpha))
        validate_compare_request(histograms, options)
        if options.include_summary:
            options.summary_text = f"Compared: {len(histograms)} histograms"
        with PLOT_LOCK:
            image = render_compare_th1(histograms, options, image_format)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(content=image, media_type=media_type(image_format))


@app.post("/api/files/{file_id}/panel")
def panel(file_id: str, payload: dict):
    root_path = file_path(file_id)
    image_format = payload.get("format", "png")
    if image_format not in {"png", "pdf", "svg"}:
        raise HTTPException(status_code=400, detail="Format must be png, pdf, or svg")

    paths = payload.get("paths", [])
    if not paths:
        raise HTTPException(status_code=400, detail="Select at least one object")

    try:
        options = options_from_settings(payload.get("settings", {}))
        columns = int(payload.get("columns", 2))
        objects = [(path, get_histogram(root_path, path)) for path in paths]
        for _, obj in objects:
            validate_plot_request(obj, options, allow_fit=False)
        with PLOT_LOCK:
            image = render_panel(
                objects,
                options,
                image_format,
                columns=columns,
                shared_x=bool(payload.get("sharedX", False)),
                shared_y=bool(payload.get("sharedY", False)),
                equal_ranges=bool(payload.get("equalRanges", False)),
                panel_titles=bool(payload.get("panelTitles", True)),
                global_title=empty_to_none(payload.get("globalTitle")),
                spacing=optional_float(payload.get("spacing"), 0.25) or 0.25,
            )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(content=image, media_type=media_type(image_format))


def file_path(file_id: str) -> Path:
    cleanup_uploads()
    root_path = FILES.get(file_id)
    if not root_path or not root_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return root_path


def app_metadata() -> dict:
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "assetVersion": ASSET_VERSION,
        "formats": {
            "project": {
                "schema": PROJECT_SCHEMA,
                "schemaVersion": PROJECT_SCHEMA_VERSION,
            },
            "style": {
                "schema": STYLE_SCHEMA,
                "schemaVersion": STYLE_SCHEMA_VERSION,
            },
            "exportManifest": {
                "schema": EXPORT_MANIFEST_SCHEMA,
                "schemaVersion": EXPORT_MANIFEST_SCHEMA_VERSION,
            },
            "llmExport": {
                "schema": LLM_EXPORT_SCHEMA,
                "schemaVersion": LLM_EXPORT_SCHEMA_VERSION,
            },
        },
    }


def export_manifest(root_path: Path, image_format: str, global_settings: dict, hist_settings: dict, histograms: list[dict]) -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    objects = []
    for hist_info in histograms:
        path = hist_info["path"]
        objects.append(
            {
                "path": path,
                "kind": hist_info.get("kind"),
                "className": hist_info.get("className"),
                "output": f"{safe_name(path)}.{image_format}",
                "hasObjectSettings": path in hist_settings,
                "settings": {**global_settings, **hist_settings.get(path, {})},
            }
        )
    return {
        "schema": EXPORT_MANIFEST_SCHEMA,
        "schemaVersion": EXPORT_MANIFEST_SCHEMA_VERSION,
        "createdAt": created_at,
        "app": app_metadata(),
        "source": {
            "rootFileName": root_path.name,
            "rootFilePath": str(root_path) if ALLOW_LOCAL_FILE_OPEN else "",
        },
        "format": image_format,
        "objectCount": len(objects),
        "globalSettings": global_settings,
        "objects": objects,
    }


def empty_to_none(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    return value


def parse_aspect_ratio(value: str) -> float:
    try:
        if ":" in value:
            width, height = value.split(":", 1)
            ratio = float(width) / float(height)
        else:
            ratio = float(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Aspect ratio must be like 16:9 or 1.6") from exc

    if ratio <= 0 or ratio > 10:
        raise HTTPException(status_code=400, detail="Aspect ratio must be between 0 and 10")
    return ratio


def options_from_settings(settings: dict) -> PlotOptions:
    return PlotOptions(
        dpi=optional_int(settings.get("dpi"), 200),
        aspect_ratio=parse_aspect_ratio(settings.get("aspectRatio") or "16:10"),
        x_scale=settings.get("xScale") or "linear",
        y_scale=settings.get("yScale") or "linear",
        z_scale=settings.get("zScale") or "linear",
        colormap=settings.get("colormap") or "white-blue",
        normalization=settings.get("normalization") or "raw",
        show_errors=bool(settings.get("showErrors", True)),
        show_legend=bool(settings.get("showLegend", True)),
        uncertainty_band=bool(settings.get("uncertaintyBand", False)),
        line_style=settings.get("lineStyle") or "solid",
        marker_style=settings.get("markerStyle") or "none",
        line_alpha=optional_float(settings.get("lineAlpha"), 1.0),
        compare_mode=settings.get("compareMode") or "overlay",
        fit_enabled=bool(settings.get("fitEnabled", False)),
        fit_model=settings.get("fitModel") or "gaussian",
        fit_x_min=optional_float(settings.get("fitXMin")),
        fit_x_max=optional_float(settings.get("fitXMax")),
        include_summary=bool(settings.get("includeSummary", False)),
        font_family=settings.get("fontFamily") or "Arial, Helvetica, Liberation Sans, DejaVu Sans",
        figure_facecolor=settings.get("figureFacecolor") or "#ffffff",
        axes_facecolor=settings.get("axesFacecolor") or "#ffffff",
        text_color=settings.get("textColor") or "#111827",
        axis_color=settings.get("axisColor") or "#111827",
        tick_direction=settings.get("tickDirection") or "out",
        line_width=optional_float(settings.get("lineWidth"), 2.0),
        line_color=settings.get("lineColor") or "#1f77b4",
        title=empty_to_none(settings.get("title")),
        x_label=empty_to_none(settings.get("xLabel")),
        y_label=empty_to_none(settings.get("yLabel")),
        title_font_size=optional_int(settings.get("titleFontSize"), 13),
        label_font_size=optional_int(settings.get("labelFontSize"), 11),
        tick_font_size=optional_int(settings.get("tickFontSize"), 10),
        x_min=optional_float(settings.get("xMin")),
        x_max=optional_float(settings.get("xMax")),
        y_min=optional_float(settings.get("yMin")),
        y_max=optional_float(settings.get("yMax")),
        z_min=optional_float(settings.get("zMin")),
        z_max=optional_float(settings.get("zMax")),
    )


def validate_plot_request(obj, options: PlotOptions, allow_fit: bool = True) -> None:
    kind = plot_kind(obj)
    validate_ranges(options)
    if options.fit_enabled:
        if not allow_fit:
            raise ValueError("Fit is not available in panel export. Disable fit or export a single object.")
        if kind not in {"TH1", "TProfile"}:
            raise ValueError("Fit is supported for TH1 and TProfile objects only")
        validate_fit_range(obj, options)
    if options.x_scale == "log" and not has_positive_x(obj, kind):
        raise ValueError("Log X scale requires positive X values")
    if options.y_scale == "log" and not has_positive_y(obj, kind):
        raise ValueError("Log Y scale requires positive Y values")
    if options.z_scale == "log" and kind not in {"TH2", "TProfile2D"}:
        raise ValueError("Log Z scale is available for TH2/TProfile2D objects only")
    if options.z_scale == "log" and kind in {"TH2", "TProfile2D"} and not has_positive_z(obj):
        raise ValueError("Log Z scale requires positive bin contents")


def validate_compare_request(histograms: list[tuple], options: PlotOptions) -> None:
    validate_ranges(options)
    if options.fit_enabled:
        raise ValueError("Fit is not available in compare mode. Disable fit or use a single object.")
    if options.x_scale == "log":
        for _, hist, *_ in histograms:
            if not has_positive_x(hist, plot_kind(hist)):
                raise ValueError("Log X scale requires positive X values for all compared objects")
    if options.y_scale == "log":
        for _, hist, *_ in histograms:
            if not has_positive_y(hist, plot_kind(hist)):
                raise ValueError("Log Y scale requires positive Y values for all compared objects")
    if options.compare_mode != "overlay":
        reference_edges = histograms[0][1].to_numpy()[1]
        for _, hist, *_ in histograms[1:]:
            edges = hist.to_numpy()[1]
            if len(edges) != len(reference_edges) or not np.allclose(edges, reference_edges):
                raise ValueError("Ratio/difference compare requires identical binning")


def validate_ranges(options: PlotOptions) -> None:
    range_pairs = [
        ("X", options.x_min, options.x_max),
        ("Y", options.y_min, options.y_max),
        ("Z", options.z_min, options.z_max),
        ("Fit X", options.fit_x_min, options.fit_x_max),
    ]
    for name, lower, upper in range_pairs:
        if lower is not None and upper is not None and lower >= upper:
            raise ValueError(f"{name} min must be smaller than {name} max")
    if options.x_scale == "log" and options.x_min is not None and options.x_min <= 0:
        raise ValueError("Log X scale requires X min to be positive")
    if options.y_scale == "log" and options.y_min is not None and options.y_min <= 0:
        raise ValueError("Log Y scale requires Y min to be positive")
    if options.z_scale == "log" and options.z_min is not None and options.z_min <= 0:
        raise ValueError("Log Z scale requires Z min to be positive")


def validate_fit_range(obj, options: PlotOptions) -> None:
    values, edges = profile_numpy(obj) if plot_kind(obj) == "TProfile" else obj.to_numpy()
    centers = 0.5 * (edges[:-1] + edges[1:])
    mask = np.isfinite(values) & np.isfinite(centers)
    if options.fit_x_min is not None:
        mask &= centers >= options.fit_x_min
    if options.fit_x_max is not None:
        mask &= centers <= options.fit_x_max
    required_points = fit_required_points(options.fit_model)
    if np.count_nonzero(mask) < required_points:
        raise ValueError(f"Fit range contains too few points for {options.fit_model}: need at least {required_points}")
    if options.fit_model == "exponential" and np.count_nonzero(values[mask] > 0) < 2:
        raise ValueError("Exponential fit requires at least two positive bins in the fit range")


def fit_required_points(model: str) -> int:
    match = re.fullmatch(r"pol([0-6])", model or "")
    if match:
        return int(match.group(1)) + 1
    return {"linear": 2, "quadratic": 3, "cubic": 4}.get(model, 3)


def analysis_payload(obj, options: PlotOptions, x_min: float | None, x_max: float | None) -> dict:
    kind = plot_kind(obj)
    warnings = analysis_warnings(obj, kind, options)
    payload = {
        "kind": kind,
        "range": {"xMin": x_min, "xMax": x_max},
        "metadata": analysis_metadata(kind, options),
        "warnings": warnings,
    }
    if kind not in {"TH1", "TProfile"}:
        payload["message"] = "Analysis v1 supports TH1 and TProfile objects"
        return payload

    values, edges = profile_numpy(obj) if kind == "TProfile" else obj.to_numpy()
    centers = 0.5 * (edges[:-1] + edges[1:])
    mask = np.isfinite(values) & np.isfinite(centers)
    if x_min is not None:
        mask &= centers >= x_min
    if x_max is not None:
        mask &= centers <= x_max

    selected_values = values[mask]
    selected_centers = centers[mask]
    selected_integral = float(np.sum(selected_values)) if len(selected_values) else 0.0
    total_integral = float(np.sum(values))
    selected_mean = weighted_mean(selected_centers, selected_values)
    selected_rms = weighted_rms(selected_centers, selected_values, selected_mean)
    payload["rangeStats"] = {
        "bins": int(np.count_nonzero(mask)),
        "integral": selected_integral,
        "fraction": selected_integral / total_integral if total_integral else 0.0,
        "mean": selected_mean,
        "rms": selected_rms,
    }

    if options.fit_enabled:
        payload["fit"] = fit_analysis(values, edges, options)
    else:
        payload["fit"] = {"enabled": False, "message": "Fit is disabled"}
    return payload


def analysis_metadata(kind: str, options: PlotOptions) -> dict:
    return {
        "objectKind": kind,
        "normalization": normalization_label(options.normalization),
        "integralDefinition": integral_definition(options.normalization),
        "fitInput": "displayed normalized values" if options.normalization != "raw" else "raw bin contents",
        "profileSemantics": profile_semantics(kind),
        "logScales": {
            "x": options.x_scale == "log",
            "y": options.y_scale == "log",
            "z": options.z_scale == "log",
        },
    }


def integral_definition(normalization: str) -> str:
    if normalization == "bin_width":
        return "displayed values are divided by bin width; visual density and raw bin sums differ"
    if normalization == "area":
        return "displayed values are scaled to unit area"
    if normalization == "max":
        return "displayed values are scaled to unit maximum"
    return "sum of raw bin contents"


def profile_semantics(kind: str) -> str:
    if kind == "TProfile":
        return "profile bins are mean Y values per X bin, not event counts"
    if kind == "TProfile2D":
        return "profile bins are mean values per X/Y bin, not event density"
    return ""


def fit_analysis(values, edges, options: PlotOptions) -> dict:
    centers = 0.5 * (edges[:-1] + edges[1:])
    mask = np.isfinite(values) & np.isfinite(centers)
    if options.fit_x_min is not None:
        mask &= centers >= options.fit_x_min
    if options.fit_x_max is not None:
        mask &= centers <= options.fit_x_max

    x_fit = centers[mask].astype(float)
    y_fit = values[mask].astype(float)
    required_points = fit_required_points(options.fit_model)
    if len(x_fit) < required_points:
        return {
            "enabled": True,
            "ok": False,
            "message": f"Fit range contains too few points for {options.fit_model}: need at least {required_points}",
        }

    model = options.fit_model
    order = polynomial_order(model)
    parameters = []
    if order is not None:
        coeffs = np.polyfit(x_fit, y_fit, order)
        y_model = np.polyval(coeffs, x_fit)
        parameters = [{"name": f"p{index}", "value": float(value)} for index, value in enumerate(coeffs[::-1])]
        label = f"pol{order}"
    elif model == "exponential":
        positive = y_fit > 0
        if np.count_nonzero(positive) < 2:
            return {"enabled": True, "ok": False, "message": "Exponential fit requires at least two positive bins"}
        slope, intercept = np.polyfit(x_fit[positive], np.log(y_fit[positive]), 1)
        y_model = np.exp(intercept + slope * x_fit)
        parameters = [
            {"name": "amplitude", "value": float(np.exp(intercept))},
            {"name": "slope", "value": float(slope)},
        ]
        label = "exponential"
    else:
        total = float(np.sum(y_fit))
        if total <= 0:
            return {"enabled": True, "ok": False, "message": "Gaussian fit requires positive total content"}
        mean = float(np.sum(x_fit * y_fit) / total)
        sigma = float(np.sqrt(np.sum(y_fit * (x_fit - mean) ** 2) / total))
        if sigma <= 0:
            return {"enabled": True, "ok": False, "message": "Gaussian fit produced non-positive sigma"}
        amplitude = float(np.max(y_fit))
        y_model = amplitude * np.exp(-0.5 * ((x_fit - mean) / sigma) ** 2)
        parameters = [
            {"name": "amplitude", "value": amplitude},
            {"name": "mean", "value": mean},
            {"name": "sigma", "value": sigma},
        ]
        label = "gaussian"

    errors = np.sqrt(np.clip(y_fit, 0, None))
    valid_errors = errors > 0
    residuals = y_fit - y_model
    pulls = np.divide(residuals, errors, out=np.zeros_like(residuals), where=valid_errors)
    chi2 = float(np.sum(pulls[valid_errors] ** 2)) if np.any(valid_errors) else 0.0
    ndf = int(max(np.count_nonzero(valid_errors) - len(parameters), 0))
    return {
        "enabled": True,
        "ok": True,
        "model": label,
        "points": int(len(x_fit)),
        "parameters": parameters,
        "chi2": chi2,
        "ndf": ndf,
        "chi2Ndf": chi2 / ndf if ndf else None,
        "residualMean": float(np.mean(residuals)) if len(residuals) else 0.0,
        "residualRms": float(np.std(residuals)) if len(residuals) else 0.0,
        "pullMean": float(np.mean(pulls[valid_errors])) if np.any(valid_errors) else 0.0,
        "pullRms": float(np.std(pulls[valid_errors])) if np.any(valid_errors) else 0.0,
    }


def analysis_warnings(obj, kind: str, options: PlotOptions) -> list[str]:
    warnings = []
    if kind == "TH2":
        values, _, _ = obj.to_numpy()
    elif kind == "TProfile2D":
        values, _, _ = profile2d_numpy(obj)
    elif kind == "TProfile":
        values, _ = profile_numpy(obj)
    elif kind == "TH1":
        values, _ = obj.to_numpy()
    elif kind == "TGraph":
        x_values = np.asarray(obj.member("fX"), dtype=float)[: int(obj.member("fN"))]
        y_values = np.asarray(obj.member("fY"), dtype=float)[: int(obj.member("fN"))]
        values = y_values
        if options.x_scale == "log" and np.any(x_values <= 0):
            warnings.append("Log X scale hides or rejects non-positive X points")
    else:
        return [f"Unsupported object kind: {kind}"]

    values_array = np.asarray(values)
    if np.any(values_array < 0):
        warnings.append("Object contains negative values")
    if options.y_scale == "log" and np.any(values_array <= 0):
        warnings.append("Log Y scale hides or rejects non-positive values")
    if options.z_scale == "log" and kind in {"TH2", "TProfile2D"} and np.any(values_array <= 0):
        warnings.append("Log Z scale hides or rejects non-positive bin values")
    if options.normalization != "raw":
        warnings.append(f"Normalization changes displayed amplitudes: {normalization_label(options.normalization)}")
    if options.normalization == "bin_width":
        warnings.append("Bin-width normalization displays density-like values; raw bin sums and visual area have different meanings")
    if kind == "TProfile":
        warnings.append("TProfile bins represent mean Y per X bin; entries and integrals are not ordinary TH1 event-count integrals")
    if kind == "TProfile2D":
        warnings.append("TProfile2D bins represent mean values per X/Y bin; color scale is not event density")
    if options.fit_enabled and options.normalization != "raw":
        warnings.append("Fit is applied to displayed normalized values, not raw bin contents")
    if options.fit_enabled and kind not in {"TH1", "TProfile"}:
        warnings.append("Fit is only available for TH1 and TProfile in Analysis v1")
    return warnings


def normalization_label(value: str) -> str:
    return {
        "area": "area = 1",
        "max": "max = 1",
        "bin_width": "divide by bin width",
        "raw": "raw",
    }.get(value, value)


def weighted_mean(centers, weights) -> float:
    total = float(np.sum(weights))
    if total == 0:
        return 0.0
    return float(np.sum(centers * weights) / total)


def weighted_rms(centers, weights, mean: float) -> float:
    total = float(np.sum(weights))
    if total == 0:
        return 0.0
    variance = np.sum(((centers - mean) ** 2) * weights) / total
    return float(np.sqrt(max(variance, 0.0)))


def polynomial_order(model: str) -> int | None:
    aliases = {"linear": 1, "quadratic": 2, "cubic": 3}
    if model in aliases:
        return aliases[model]
    match = re.fullmatch(r"pol([0-6])", model or "")
    return int(match.group(1)) if match else None


def has_positive_x(obj, kind: str) -> bool:
    if kind == "TGraph":
        x_values = np.asarray(obj.member("fX"), dtype=float)[: int(obj.member("fN"))]
        return bool(np.any(x_values > 0))
    if kind == "TH2":
        _, x_edges, _ = obj.to_numpy()
        return bool(np.any(x_edges > 0))
    if kind == "TProfile2D":
        _, x_edges, _ = profile2d_numpy(obj)
        return bool(np.any(x_edges > 0))
    _, edges = profile_numpy(obj) if kind == "TProfile" else obj.to_numpy()
    return bool(np.any(edges > 0))


def has_positive_y(obj, kind: str) -> bool:
    if kind == "TGraph":
        y_values = np.asarray(obj.member("fY"), dtype=float)[: int(obj.member("fN"))]
        return bool(np.any(y_values > 0))
    if kind == "TH2":
        _, _, y_edges = obj.to_numpy()
        return bool(np.any(y_edges > 0))
    if kind == "TProfile2D":
        _, _, y_edges = profile2d_numpy(obj)
        return bool(np.any(y_edges > 0))
    values, _ = profile_numpy(obj) if kind == "TProfile" else obj.to_numpy()
    return bool(np.any(values > 0))


def has_positive_z(obj) -> bool:
    values, _, _ = profile2d_numpy(obj) if plot_kind(obj) == "TProfile2D" else obj.to_numpy()
    return bool(np.any(values > 0))


def optional_float(value, fallback: float | None = None) -> float | None:
    if value is None or value == "":
        return fallback
    return float(value)


def optional_int(value, fallback: int) -> int:
    if value is None or value == "":
        return fallback
    return int(value)


def media_type(image_format: str) -> str:
    return {
        "png": "image/png",
        "pdf": "application/pdf",
        "svg": "image/svg+xml",
    }[image_format]


def safe_name(value: str) -> str:
    return re.sub(r'[\\/:*?"<>|]+', "_", value)


def summary_line(root_path: Path, hist_path: str) -> str:
    summary = histogram_summary(root_path, hist_path)
    if summary["kind"] == "TGraph":
        return (
            f"Points: {summary['points']} | "
            f"Mean X/Y: {format_number(summary['meanX'])} / {format_number(summary['meanY'])} | "
            f"RMS X/Y: {format_number(summary['rmsX'])} / {format_number(summary['rmsY'])}"
        )
    if summary["kind"] == "TH2":
        return (
            f"Entries: {format_number(summary['entries'])} | "
            f"Integral: {format_number(summary['integral'])} | "
            f"Mean X/Y: {format_number(summary['meanX'])} / {format_number(summary['meanY'])} | "
            f"RMS X/Y: {format_number(summary['rmsX'])} / {format_number(summary['rmsY'])}"
        )
    return (
        f"Entries: {format_number(summary['entries'])} | "
        f"Integral: {format_number(summary['integral'])} | "
        f"Mean: {format_number(summary['mean'])} | "
        f"RMS: {format_number(summary['rms'])}"
    )


def format_number(value: float) -> str:
    return f"{value:.5g}"


def cleanup_uploads() -> None:
    now = time.time()
    for path in UPLOAD_DIR.glob("*.root"):
        try:
            age = now - path.stat().st_mtime
        except OSError:
            continue
        if age <= UPLOAD_TTL_SECONDS:
            continue
        try:
            path.unlink(missing_ok=True)
        except OSError:
            continue
        for file_id, stored_path in list(FILES.items()):
            if stored_path == path:
                FILES.pop(file_id, None)
