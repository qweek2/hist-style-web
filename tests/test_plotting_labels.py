from plotting import ascii_safe_text, plain_root_text, safe_label_text, validate_mathtext_label


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
