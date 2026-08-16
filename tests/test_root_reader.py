import numpy as np

from root_reader import axis_edges, canvas_drawables, fallback_canvas_primitives, histogram_kind, json_safe, list_root_folders


class FakeAxis:
    def __init__(self, n_bins=4, x_min=0.0, x_max=2.0, x_bins=None):
        self.values = {
            "fNbins": n_bins,
            "fXmin": x_min,
            "fXmax": x_max,
            "fXbins": x_bins if x_bins is not None else [],
        }

    def member(self, name):
        return self.values[name]


def test_histogram_kind_detects_tprofile2d_before_tprofile():
    assert histogram_kind("TCanvas") == "TCanvas"
    assert histogram_kind("TPad") == "TCanvas"
    assert histogram_kind("TProfile2D") == "TProfile2D"
    assert histogram_kind("TProfile2D_v7") == "TProfile2D"
    assert histogram_kind("Model_TProfile_v7") == "TProfile"
    assert histogram_kind("TProfile") == "TProfile"
    assert histogram_kind("TH2D") == "TH2"
    assert histogram_kind("TH1F") == "TH1"
    assert histogram_kind("TGraphErrors") == "TGraph"
    assert histogram_kind("TCanvas") == "TCanvas"


def test_axis_edges_uses_explicit_edges_when_available():
    edges = axis_edges(FakeAxis(n_bins=3, x_bins=[0.0, 0.1, 0.4, 1.0]))

    assert np.allclose(edges, [0.0, 0.1, 0.4, 1.0])


def test_axis_edges_falls_back_to_uniform_edges():
    edges = axis_edges(FakeAxis(n_bins=4, x_min=-1.0, x_max=1.0))

    assert np.allclose(edges, [-1.0, -0.5, 0.0, 0.5, 1.0])


def test_json_safe_converts_numpy_and_nonfinite_values():
    payload = json_safe(
        {
            "values": np.asarray([1.0, np.nan, np.inf]),
            "nested": [np.float64(2.5), -np.inf],
        }
    )

    assert payload == {"values": [1.0, None, None], "nested": [2.5, None]}


class FakeRootObject:
    def __init__(self, classname, members=None):
        self.classname = classname
        self.members = members or {}

    def member(self, name):
        return self.members[name]


def test_canvas_drawables_recurses_into_supported_primitives():
    hist = FakeRootObject("TH1D", {"fName": "h1"})
    nested = FakeRootObject("TPad", {"fPrimitives": [hist]})
    text = FakeRootObject("TLatex", {"fText": "#Delta y", "fX": 0.2, "fY": 0.8})
    canvas = FakeRootObject("TCanvas", {"fPrimitives": [nested, text]})

    drawables = canvas_drawables(canvas)

    assert len(drawables) == 2
    assert drawables[0][0] == "h1"
    assert drawables[0][1] is hist
    assert drawables[1][1] is text


class FakeRootFile:
    def __init__(self):
        self.objects = {
            "hFHCal_pty_all": FakeRootObject("TH2F"),
            "hFHCal_pty_prim": FakeRootObject("TH2F"),
            "hA_prim": FakeRootObject("TH1D"),
            "cFHCal_PtY": FakeRootObject("TCanvas"),
        }

    def classnames(self, recursive=True):
        return {f"{name};1": obj.classname for name, obj in self.objects.items()}

    def __getitem__(self, key):
        return self.objects[key.split(";")[0]]


def test_list_root_folders_builds_nested_paths(monkeypatch):
    class FakeOpen:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def classnames(self, recursive=True):
            return {
                "physics;1": "TDirectoryFile",
                "physics/energy;1": "TDirectoryFile",
                "physics/energy/h1;1": "TH1D",
            }

    monkeypatch.setattr("root_reader.uproot.open", lambda path: FakeOpen())
    assert list_root_folders("sample.root") == [
        {"path": "physics", "name": "physics"},
        {"path": "physics/energy", "name": "energy"},
    ]


def test_fallback_canvas_primitives_matches_related_top_level_objects():
    primitives = fallback_canvas_primitives(FakeRootFile(), "cFHCal_PtY")

    assert [name for name, _ in primitives] == ["hFHCal_pty_all", "hFHCal_pty_prim"]
