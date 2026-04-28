from pathlib import Path

import numpy as np
import uproot


SUPPORTED_KINDS = ("TH1", "TH2", "TProfile", "TGraph")


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
    kind = histogram_kind(hist.classname)
    if kind == "TH2":
        return th2_summary(hist)
    if kind == "TGraph":
        return tgraph_summary(hist)
    return th1_summary(hist)


def object_info(root_path: Path, hist_path: str) -> dict:
    obj = get_histogram(root_path, hist_path)
    kind = histogram_kind(obj.classname) or obj.classname
    info = {
        "path": hist_path,
        "className": obj.classname,
        "kind": kind,
        "title": member_text(obj, "fTitle"),
    }

    if kind in {"TH1", "TProfile"}:
        values, edges = obj.to_numpy()
        info.update(
            {
                "binsX": int(len(values)),
                "xMin": float(edges[0]),
                "xMax": float(edges[-1]),
                "xTitle": axis_title(obj, 0),
                "yTitle": axis_title(obj, 1),
                "entries": member_float(obj, "fEntries"),
            }
        )
    elif kind == "TH2":
        values, x_edges, y_edges = obj.to_numpy()
        info.update(
            {
                "binsX": int(values.shape[0]),
                "binsY": int(values.shape[1]),
                "xMin": float(x_edges[0]),
                "xMax": float(x_edges[-1]),
                "yMin": float(y_edges[0]),
                "yMax": float(y_edges[-1]),
                "xTitle": axis_title(obj, 0),
                "yTitle": axis_title(obj, 1),
                "entries": member_float(obj, "fEntries"),
            }
        )
    elif kind == "TGraph":
        x_values, y_values, _, _ = graph_arrays(obj)
        info.update(
            {
                "points": int(len(x_values)),
                "xMin": float(np.min(x_values)) if len(x_values) else 0.0,
                "xMax": float(np.max(x_values)) if len(x_values) else 0.0,
                "yMin": float(np.min(y_values)) if len(y_values) else 0.0,
                "yMax": float(np.max(y_values)) if len(y_values) else 0.0,
            }
        )
    return info


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


def tgraph_summary(graph) -> dict:
    x_values, y_values, _, _ = graph_arrays(graph)
    return {
        "kind": "TGraph",
        "points": int(len(x_values)),
        "meanX": float(np.mean(x_values)) if len(x_values) else 0.0,
        "meanY": float(np.mean(y_values)) if len(y_values) else 0.0,
        "rmsX": float(np.std(x_values)) if len(x_values) else 0.0,
        "rmsY": float(np.std(y_values)) if len(y_values) else 0.0,
    }


def graph_arrays(graph):
    n_points = int(member_float(graph, "fN"))
    x_values = np.asarray(graph.member("fX"), dtype=float)[:n_points]
    y_values = np.asarray(graph.member("fY"), dtype=float)[:n_points]
    x_errors = graph_error_array(graph, "fEX", "fEXlow", "fEXhigh", n_points)
    y_errors = graph_error_array(graph, "fEY", "fEYlow", "fEYhigh", n_points)
    return x_values, y_values, x_errors, y_errors


def graph_error_array(graph, symmetric_name: str, low_name: str, high_name: str, n_points: int):
    try:
        return np.asarray(graph.member(symmetric_name), dtype=float)[:n_points]
    except Exception:
        pass
    try:
        low = np.asarray(graph.member(low_name), dtype=float)[:n_points]
        high = np.asarray(graph.member(high_name), dtype=float)[:n_points]
        return np.vstack([low, high])
    except Exception:
        return None


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


def member_text(obj, name: str) -> str:
    try:
        value = obj.member(name)
    except Exception:
        return ""
    return str(value or "")


def axis_title(obj, axis_index: int) -> str:
    try:
        return member_text(obj.axis(axis_index), "fTitle")
    except Exception:
        return ""


def histogram_kind(class_name: str) -> str | None:
    if class_name.startswith("TProfile"):
        return "TProfile"
    if class_name.startswith("TH2"):
        return "TH2"
    if class_name.startswith("TH1"):
        return "TH1"
    if class_name.startswith("TGraph"):
        return "TGraph"
    return None


def read_title(root_file, hist_path: str) -> str:
    try:
        title = root_file[hist_path].member("fTitle")
    except Exception:
        return ""
    return str(title or "")
