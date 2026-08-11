import numpy as np

from plotting import PlotOptions, ascii_safe_text, panel_z_limits, plain_root_text, safe_label_text, validate_mathtext_label


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
