import numpy as np

from root_reader import axis_edges, histogram_kind


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
    assert histogram_kind("TProfile2D") == "TProfile2D"
    assert histogram_kind("TProfile2D_v7") == "TProfile2D"
    assert histogram_kind("TProfile") == "TProfile"
    assert histogram_kind("TH2D") == "TH2"
    assert histogram_kind("TH1F") == "TH1"
    assert histogram_kind("TGraphErrors") == "TGraph"
    assert histogram_kind("TCanvas") is None


def test_axis_edges_uses_explicit_edges_when_available():
    edges = axis_edges(FakeAxis(n_bins=3, x_bins=[0.0, 0.1, 0.4, 1.0]))

    assert np.allclose(edges, [0.0, 0.1, 0.4, 1.0])


def test_axis_edges_falls_back_to_uniform_edges():
    edges = axis_edges(FakeAxis(n_bins=4, x_min=-1.0, x_max=1.0))

    assert np.allclose(edges, [-1.0, -0.5, 0.0, 0.5, 1.0])
