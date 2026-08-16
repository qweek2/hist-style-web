import numpy as np
import pytest

from matplotlib.figure import Figure

from plotting import PlotOptions, ascii_safe_text, compare_residual, panel_z_limits, plain_root_text, render_panel, safe_label_text, validate_mathtext_label


def test_safe_label_text_converts_root_labels_to_valid_mathtext():
    cases = {
        r"\Deltay": r"$\Delta y$",
        "p_{T} [GeV/c]": r"$p_{T}$ [GeV/c]",
        "Method B: p_{T} vs y, secondaries": r"Method B: $p_{T}$ vs y, secondaries",
        "E_{sec}/(E_{prim}+E_{sec})": r"$E_{sec}/(E_{prim}+E_{sec})$",
        "#Delta y": r"$\Delta y$",
        r"$p_{T}$": r"$p_{T}$",
    }
    for source, expected in cases.items():
        converted = safe_label_text(source)
        assert converted == expected
        assert validate_mathtext_label(converted)


def test_plain_root_text_removes_math_wrappers_and_backslashes():
    assert plain_root_text(r"$\Delta y$") == "Delta y"
    assert plain_root_text("#mu + #pi") == "mu + pi"


def test_ascii_safe_text_keeps_export_fallback_ascii_only():
    assert ascii_safe_text("#Delta y") == "Delta y"


def test_compare_residual_supports_symmetric_difference_and_pull():
    reference = {"values": np.array([2.0, 0.0]), "errors": np.array([1.0, 1.0])}
    item = {"values": np.array([3.0, 1.0]), "errors": np.array([1.0, 1.0])}
    symmetric, _, label, baseline = compare_residual(item, reference, "symmetric_difference")
    assert symmetric[0] == 40.0
    assert label == "Sym. diff. [%]"
    assert baseline == 0.0
    pull, _, label, _ = compare_residual(item, reference, "pull")
    assert pull[0] == pytest.approx(np.sqrt(0.5))
    assert label == "Pull"


class FakeTH2:
    classname = "TH2D"

    def __init__(self, values):
        self.values = np.asarray(values, dtype=float)

    def to_numpy(self):
        return self.values, np.arange(self.values.shape[0] + 1), np.arange(self.values.shape[1] + 1)


def test_panel_z_limits_uses_common_finite_range():
    limits = panel_z_limits(
        [
            ("a", FakeTH2([[0.0, 2.0], [3.0, np.nan]])),
            ("b", FakeTH2([[10.0, 12.0], [4.0, 8.0]])),
        ],
        PlotOptions(),
    )

    assert limits == (0.0, 12.0)


def test_panel_z_limits_for_log_scale_ignores_non_positive_values():
    limits = panel_z_limits(
        [
            ("a", FakeTH2([[0.0, -2.0], [3.0, np.nan]])),
            ("b", FakeTH2([[10.0, 12.0], [4.0, 8.0]])),
        ],
        PlotOptions(z_scale="log"),
    )

    assert limits == (3.0, 12.0)


def test_shared_z_panel_creates_one_colorbar(monkeypatch):
    calls = []
    original_colorbar = Figure.colorbar

    def spy_colorbar(self, *args, **kwargs):
        calls.append((args, kwargs))
        return original_colorbar(self, *args, **kwargs)

    monkeypatch.setattr(Figure, "colorbar", spy_colorbar)
    render_panel(
        [("a", FakeTH2([[1.0, 2.0], [3.0, 4.0]])), ("b", FakeTH2([[4.0, 3.0], [2.0, 1.0]]))],
        PlotOptions(),
        columns=2,
        shared_z=True,
    )

    assert len(calls) == 1
