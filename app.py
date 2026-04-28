from pathlib import Path
from uuid import uuid4
from io import BytesIO
import os
import re
import time
import zipfile

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from plotting import PlotOptions, plot_kind, render_compare_th1, render_histogram, render_panel
from root_reader import get_histogram, histogram_summary, list_histograms, object_info


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
STATIC_DIR = BASE_DIR / "static"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "200")) * 1024 * 1024
UPLOAD_TTL_SECONDS = int(os.getenv("UPLOAD_TTL_SECONDS", "3600"))

UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Histogram Style Web")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

FILES: dict[str, Path] = {}


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


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
    dpi: int = Query(default=200, ge=100, le=300),
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


@app.get("/api/files/{file_id}/info")
def info(file_id: str, path: str):
    root_path = file_path(file_id)
    try:
        return object_info(root_path, path)
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
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for hist_info in histograms:
                path = hist_info["path"]
                settings = {**global_settings, **hist_settings.get(path, {})}
                options = options_from_settings(settings)
                if options.include_summary:
                    options.summary_text = summary_line(root_path, path)
                hist = get_histogram(root_path, path)
                image = render_histogram(hist, options, image_format)
                archive.writestr(f"{safe_name(path)}.{image_format}", image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="histograms.zip"'},
    )


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
        if options.include_summary:
            options.summary_text = f"Compared: {len(histograms)} histograms"
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
