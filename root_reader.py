from pathlib import Path

import numpy as np
import uproot


SUPPORTED_KINDS = ("TH1", "TH2")


def list_histograms(root_path: Path) -> list[dict]:
    items = []

    with uproot.open(root_path) as root_file:
        for key, class_name in root_file.classnames(recursive=True).items():
            kind = histogram_kind(class_name)
            if not kind:
                continue

            clean_key = key.split(";")[0]
            items.append(
                {
                    "path": clean_key,
                    "className": class_name,
                    "kind": kind,
                    "title": read_title(root_file, clean_key),
                }
            )

    return items


def get_histogram(root_path: Path, hist_path: str):
    with uproot.open(root_path) as root_file:
        return root_file[hist_path]


def histogram_summary(root_path: Path, hist_path: str) -> dict:
    hist = get_histogram(root_path, hist_path)
    if hist.classname.startswith("TH2"):
        return th2_summary(hist)
    return th1_summary(hist)


def th1_summary(hist) -> dict:
    values, edges = hist.to_numpy()
    centers = 0.5 * (edges[:-1] + edges[1:])
    integral = float(np.sum(values))
    mean = weighted_mean(centers, values)
    rms = weighted_rms(centers, values, mean)

    return {
        "kind": "TH1",
        "entries": member_float(hist, "fEntries"),
        "integral": integral,
        "mean": mean,
        "rms": rms,
    }


def th2_summary(hist) -> dict:
    values, x_edges, y_edges = hist.to_numpy()
    x_centers = 0.5 * (x_edges[:-1] + x_edges[1:])
    y_centers = 0.5 * (y_edges[:-1] + y_edges[1:])
    integral = float(np.sum(values))
    x_weights = np.sum(values, axis=1)
    y_weights = np.sum(values, axis=0)
    mean_x = weighted_mean(x_centers, x_weights)
    mean_y = weighted_mean(y_centers, y_weights)

    return {
        "kind": "TH2",
        "entries": member_float(hist, "fEntries"),
        "integral": integral,
        "meanX": mean_x,
        "meanY": mean_y,
        "rmsX": weighted_rms(x_centers, x_weights, mean_x),
        "rmsY": weighted_rms(y_centers, y_weights, mean_y),
    }


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


def member_float(obj, name: str) -> float:
    try:
        return float(obj.member(name))
    except Exception:
        return 0.0


def histogram_kind(class_name: str) -> str | None:
    if class_name.startswith("TH2"):
        return "TH2"
    if class_name.startswith("TH1"):
        return "TH1"
    return None


def read_title(root_file, hist_path: str) -> str:
    try:
        title = root_file[hist_path].member("fTitle")
    except Exception:
        return ""
    return str(title or "")
