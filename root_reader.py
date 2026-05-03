from pathlib import Path

import numpy as np
import uproot


SUPPORTED_KINDS = ("TH1", "TH2", "TProfile", "TProfile2D", "TGraph")


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
    if kind in {"TH2", "TProfile2D"}:
        return th2_summary(hist)
    if kind == "TGraph":
        return tgraph_summary(hist)
    return th1_summary(hist)


def llm_export_payload(root_path: Path, paths: list[str]) -> dict:
    exported = []
    for hist_path in paths:
        obj = get_histogram(root_path, hist_path)
        exported.append(llm_export_object(obj, hist_path))

    return json_safe(
        {
            "schema": "hist-style-web.llm-export",
            "schemaVersion": 1,
            "source": {
                "rootFileName": root_path.name,
            },
            "objectCount": len(exported),
            "histograms": exported,
        }
    )


def llm_export_object(obj, hist_path: str) -> dict:
    kind = histogram_kind(obj.classname) or obj.classname
    base = {
        "object": kind,
        "class_name": obj.classname,
        "path": hist_path,
        "title": member_text(obj, "fTitle"),
        "x_label": axis_title(obj, 0),
        "y_label": axis_title(obj, 1),
        "entries": member_float(obj, "fEntries"),
    }

    if kind in {"TH1", "TProfile"}:
        values, edges = profile_numpy(obj) if kind == "TProfile" else obj.to_numpy()
        errors = bin_errors(obj, values, profile=(kind == "TProfile"))
        base.update(th1_summary(obj))
        base.update(
            {
                "bin_edges": edges,
                "bin_values": values,
                "bin_errors": errors,
                "underflow": flow_value(obj, "underflow"),
                "overflow": flow_value(obj, "overflow"),
            }
        )
        if kind == "TProfile":
            base["semantics"] = "TProfile bin values are mean Y per X bin, not raw event counts."
        return base

    if kind in {"TH2", "TProfile2D"}:
        values, x_edges, y_edges = profile2d_numpy(obj) if kind == "TProfile2D" else obj.to_numpy()
        base.update(th2_summary(obj))
        base.update(
            {
                "x_bin_edges": x_edges,
                "y_bin_edges": y_edges,
                "bin_values": values,
                "z_label": axis_title(obj, 2),
            }
        )
        if kind == "TProfile2D":
            base["semantics"] = "TProfile2D bin values are mean Z per X/Y bin, not raw event counts."
        return base

    if kind == "TGraph":
        x_values, y_values, x_errors, y_errors = graph_arrays(obj)
        base.update(tgraph_summary(obj))
        base.update(
            {
                "points": int(len(x_values)),
                "x_values": x_values,
                "y_values": y_values,
                "x_errors": x_errors,
                "y_errors": y_errors,
            }
        )
        return base

    return base


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
        values, edges = profile_numpy(obj) if kind == "TProfile" else obj.to_numpy()
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
    elif kind in {"TH2", "TProfile2D"}:
        values, x_edges, y_edges = profile2d_numpy(obj) if kind == "TProfile2D" else obj.to_numpy()
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
    kind = histogram_kind(hist.classname)
    values, edges = profile_numpy(hist) if kind == "TProfile" else hist.to_numpy()
    centers = 0.5 * (edges[:-1] + edges[1:])
    integral = float(np.sum(values))
    mean = weighted_mean(centers, values)
    rms = weighted_rms(centers, values, mean)

    return {
        "kind": kind or "TH1",
        "entries": member_float(hist, "fEntries"),
        "integral": integral,
        "mean": mean,
        "rms": rms,
    }


def th2_summary(hist) -> dict:
    kind = histogram_kind(hist.classname)
    values, x_edges, y_edges = profile2d_numpy(hist) if kind == "TProfile2D" else hist.to_numpy()
    x_centers = 0.5 * (x_edges[:-1] + x_edges[1:])
    y_centers = 0.5 * (y_edges[:-1] + y_edges[1:])
    integral = float(np.sum(values))
    x_weights = np.sum(values, axis=1)
    y_weights = np.sum(values, axis=0)
    mean_x = weighted_mean(x_centers, x_weights)
    mean_y = weighted_mean(y_centers, y_weights)

    return {
        "kind": kind or "TH2",
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


def bin_errors(hist, values, profile: bool = False):
    try:
        return np.asarray(hist.errors(flow=False), dtype=float)
    except Exception:
        if profile:
            return None
        return np.sqrt(np.clip(np.asarray(values, dtype=float), 0, None))


def flow_value(hist, side: str) -> float | None:
    try:
        values = np.asarray(hist.values(flow=True), dtype=float)
        if len(values) < 2:
            return None
        return float(values[0] if side == "underflow" else values[-1])
    except Exception:
        return None


def json_safe(value):
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if isinstance(value, np.ndarray):
        return json_safe(value.tolist())
    if isinstance(value, np.generic):
        return json_safe(value.item())
    if isinstance(value, float):
        return value if np.isfinite(value) else None
    return value


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
    if class_name.startswith("TProfile2D"):
        return "TProfile2D"
    if class_name.startswith("TProfile"):
        return "TProfile"
    if class_name.startswith("TH2"):
        return "TH2"
    if class_name.startswith("TH1"):
        return "TH1"
    if class_name.startswith("TGraph"):
        return "TGraph"
    return None


def profile_numpy(hist):
    try:
        return hist.to_numpy()
    except Exception:
        pass
    try:
        return np.asarray(hist.values(flow=False), dtype=float), np.asarray(hist.axis().edges(), dtype=float)
    except Exception:
        pass

    bin_entries = np.asarray(hist.member("fBinEntries"), dtype=float)
    try:
        array = np.asarray(hist.member("fArray"), dtype=float)
    except Exception:
        array = np.asarray(hist.member("fSumw2"), dtype=float)
    axis = hist.member("fXaxis")
    n_bins = int(axis.member("fNbins"))
    sums = array[1 : n_bins + 1]
    entries = bin_entries[1 : n_bins + 1]
    values = np.divide(sums, entries, out=np.zeros_like(sums, dtype=float), where=entries != 0)
    try:
        edges = np.asarray(axis.member("fXbins"), dtype=float)
        if len(edges) == n_bins + 1:
            return values, edges
    except Exception:
        pass
    return values, np.linspace(float(axis.member("fXmin")), float(axis.member("fXmax")), n_bins + 1)


def profile2d_numpy(hist):
    try:
        values = np.asarray(hist.values(flow=False), dtype=float)
        x_edges = np.asarray(hist.axis(0).edges(), dtype=float)
        y_edges = np.asarray(hist.axis(1).edges(), dtype=float)
        return values, x_edges, y_edges
    except Exception:
        pass

    x_axis = hist.member("fXaxis")
    y_axis = hist.member("fYaxis")
    nx = int(x_axis.member("fNbins"))
    ny = int(y_axis.member("fNbins"))
    x_edges = axis_edges(x_axis)
    y_edges = axis_edges(y_axis)
    entries = np.asarray(hist.member("fBinEntries"), dtype=float)
    sums = np.asarray(hist.member("fSumw2"), dtype=float)
    values = np.zeros((nx, ny), dtype=float)
    for ix in range(nx):
        for iy in range(ny):
            index = (nx + 2) * (iy + 1) + (ix + 1)
            if index < len(entries) and entries[index] != 0:
                values[ix, iy] = sums[index] / entries[index]
    return values, x_edges, y_edges


def axis_edges(axis):
    n_bins = int(axis.member("fNbins"))
    try:
        edges = np.asarray(axis.member("fXbins"), dtype=float)
        if len(edges) == n_bins + 1:
            return edges
    except Exception:
        pass
    return np.linspace(float(axis.member("fXmin")), float(axis.member("fXmax")), n_bins + 1)


def read_title(root_file, hist_path: str) -> str:
    try:
        title = root_file[hist_path].member("fTitle")
    except Exception:
        return ""
    return str(title or "")
