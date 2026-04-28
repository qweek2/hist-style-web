from io import BytesIO
from dataclasses import dataclass
import re

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap, LogNorm, Normalize


@dataclass
class PlotOptions:
    dpi: int = 200
    aspect_ratio: float = 1.6
    x_scale: str = "linear"
    y_scale: str = "linear"
    z_scale: str = "linear"
    colormap: str = "white-blue"
    normalization: str = "raw"
    show_errors: bool = True
    show_legend: bool = True
    include_summary: bool = False
    summary_text: str | None = None
    font_family: str = "Arial, Helvetica, Liberation Sans, DejaVu Sans"
    figure_facecolor: str = "#ffffff"
    axes_facecolor: str = "#ffffff"
    text_color: str = "#111827"
    axis_color: str = "#111827"
    tick_direction: str = "out"
    line_width: float = 2.0
    line_color: str = "#1f77b4"
    title: str | None = None
    x_label: str | None = None
    y_label: str | None = None
    title_font_size: int = 13
    label_font_size: int = 11
    tick_font_size: int = 10
    x_min: float | None = None
    x_max: float | None = None
    y_min: float | None = None
    y_max: float | None = None
    z_min: float | None = None
    z_max: float | None = None


def render_histogram(hist, options: PlotOptions | None = None, image_format: str = "png") -> bytes:
    options = options or PlotOptions()
    image_format = normalize_image_format(image_format)
    kind = "TH2" if hist.classname.startswith("TH2") else "TH1"

    plt.style.use("default")
    fig_width, fig_height = figure_size(options.aspect_ratio)
    with style_context(options):
        fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=options.dpi)
        fig.patch.set_facecolor(options.figure_facecolor)
        ax.set_facecolor(options.axes_facecolor)

        if kind == "TH2":
            draw_th2(ax, hist, options)
        else:
            draw_th1(ax, hist, options)

        apply_ranges_and_scale(ax, options)
        style_axes(ax, options)
        add_summary_to_figure(fig, options)
        fig.tight_layout()
        if options.include_summary and options.summary_text:
            fig.subplots_adjust(bottom=0.16)
        buffer = BytesIO()
        fig.savefig(
            buffer,
            format=image_format,
            bbox_inches="tight",
            facecolor=fig.get_facecolor(),
        )
        plt.close(fig)
    return buffer.getvalue()


def render_histogram_png(hist, options: PlotOptions | None = None) -> bytes:
    return render_histogram(hist, options, "png")


def draw_th1(ax, hist, options: PlotOptions) -> None:
    values, edges = hist.to_numpy()
    centers = 0.5 * (edges[:-1] + edges[1:])
    widths = np.diff(edges)
    errors = np.sqrt(np.clip(values, 0, None))
    values, errors = normalize_th1(values, errors, widths, options.normalization)

    ax.step(
        edges[:-1],
        values,
        where="post",
        color=options.line_color,
        linewidth=options.line_width,
    )
    if options.show_errors:
        ax.errorbar(
            centers,
            values,
            yerr=errors,
            fmt="none",
            ecolor=options.line_color,
            elinewidth=max(0.8, options.line_width * 0.55),
            capsize=1.8,
            alpha=0.9,
        )

    if options.x_min is None and options.x_max is None:
        ax.set_xlim(edges[0], edges[-1])
    if options.y_scale == "linear" and options.y_min is None and options.y_max is None:
        ax.set_ylim(bottom=0)
    apply_labels(ax, hist, options, default_y_label="Entries")

    if np.allclose(widths, widths[0]) is False:
        ax.text(
            0.99,
            0.98,
            "variable bin width",
            transform=ax.transAxes,
            ha="right",
            va="top",
            fontsize=8,
            color="#606b7b",
        )


def draw_th2(ax, hist, options: PlotOptions) -> None:
    values, x_edges, y_edges = hist.to_numpy()
    masked = np.ma.masked_where(values.T <= 0, values.T)

    cmap = selected_colormap(options.colormap)
    cmap.set_bad("white")
    norm = color_norm(masked, options)
    mesh = ax.pcolormesh(
        x_edges,
        y_edges,
        masked,
        cmap=cmap,
        norm=norm,
        vmin=None if norm else options.z_min,
        vmax=None if norm else options.z_max,
        shading="auto",
    )
    cbar = ax.figure.colorbar(mesh, ax=ax, pad=0.02)
    cbar.set_label("Entries", color=options.text_color, fontsize=options.label_font_size)
    cbar.ax.tick_params(labelsize=options.tick_font_size, colors=options.axis_color)
    cbar.outline.set_edgecolor(options.axis_color)

    apply_labels(ax, hist, options, default_y_label="y")


def render_compare_th1(
    histograms: list[tuple[str, object]],
    options: PlotOptions | None = None,
    image_format: str = "png",
) -> bytes:
    options = options or PlotOptions()
    image_format = normalize_image_format(image_format)

    plt.style.use("default")
    fig_width, fig_height = figure_size(options.aspect_ratio)
    with style_context(options):
        fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=options.dpi)
        fig.patch.set_facecolor(options.figure_facecolor)
        ax.set_facecolor(options.axes_facecolor)

        colors = plt.rcParams["axes.prop_cycle"].by_key()["color"]
        for index, (label, hist) in enumerate(histograms):
            values, edges = hist.to_numpy()
            widths = np.diff(edges)
            errors = np.sqrt(np.clip(values, 0, None))
            values, errors = normalize_th1(values, errors, widths, options.normalization)
            color = options.line_color if len(histograms) == 1 else colors[index % len(colors)]
            ax.step(
                edges[:-1],
                values,
                where="post",
                linewidth=options.line_width,
                color=color,
                label=label,
            )
            if options.show_errors:
                centers = 0.5 * (edges[:-1] + edges[1:])
                ax.errorbar(
                    centers,
                    values,
                    yerr=errors,
                    fmt="none",
                    ecolor=color,
                    elinewidth=max(0.8, options.line_width * 0.55),
                    capsize=1.8,
                    alpha=0.8,
                )

        apply_labels(ax, histograms[0][1], options, default_y_label="Entries")
        apply_ranges_and_scale(ax, options)
        style_axes(ax, options)
        if options.show_legend:
            legend = ax.legend(frameon=False, fontsize=options.tick_font_size)
            for text in legend.get_texts():
                text.set_color(options.text_color)

        add_summary_to_figure(fig, options)
        fig.tight_layout()
        if options.include_summary and options.summary_text:
            fig.subplots_adjust(bottom=0.16)
        buffer = BytesIO()
        fig.savefig(
            buffer,
            format=image_format,
            bbox_inches="tight",
            facecolor=fig.get_facecolor(),
        )
        plt.close(fig)
    return buffer.getvalue()


def normalize_th1(values, errors, widths, normalization: str):
    values = values.astype(float)
    errors = errors.astype(float)

    if normalization == "area":
        total = float(np.sum(values))
        if total > 0:
            return values / total, errors / total
    if normalization == "max":
        maximum = float(np.max(values)) if values.size else 0.0
        if maximum > 0:
            return values / maximum, errors / maximum
    if normalization == "bin_width":
        safe_widths = np.where(widths > 0, widths, 1.0)
        return values / safe_widths, errors / safe_widths
    return values, errors


def figure_size(aspect_ratio: float) -> tuple[float, float]:
    base_area = 40.0
    width = np.sqrt(base_area * aspect_ratio)
    height = np.sqrt(base_area / aspect_ratio)
    return float(width), float(height)


def style_context(options: PlotOptions):
    return plt.rc_context(
        {
            "font.family": "sans-serif",
            "font.sans-serif": font_stack(options.font_family),
            "pdf.fonttype": 42,
            "ps.fonttype": 42,
            "svg.fonttype": "none",
            "axes.prop_cycle": plt.cycler(
                color=[
                    "#0072B2",
                    "#D55E00",
                    "#009E73",
                    "#CC79A7",
                    "#E69F00",
                    "#56B4E9",
                    "#000000",
                ]
            ),
        }
    )


def font_stack(font_family: str) -> list[str]:
    return [font.strip() for font in font_family.split(",") if font.strip()]


def style_axes(ax, options: PlotOptions) -> None:
    ax.tick_params(
        direction=options.tick_direction,
        length=5,
        width=1,
        labelsize=options.tick_font_size,
        colors=options.axis_color,
    )
    for spine in ax.spines.values():
        spine.set_linewidth(1.1)
        spine.set_color(options.axis_color)


def add_summary_to_figure(fig, options: PlotOptions) -> None:
    if not options.include_summary or not options.summary_text:
        return
    fig.text(
        0.5,
        0.025,
        options.summary_text,
        ha="center",
        va="bottom",
        fontsize=max(7, options.tick_font_size),
        color=options.text_color,
    )


def apply_labels(ax, hist, options: PlotOptions, default_y_label: str) -> None:
    x_label = options.x_label if options.x_label is not None else axis_title(hist, 0) or "x"
    y_label = options.y_label if options.y_label is not None else axis_title(hist, 1) or default_y_label
    title = options.title if options.title is not None else member_text(hist, "fTitle")

    ax.set_xlabel(format_root_text(x_label), fontsize=options.label_font_size)
    ax.set_ylabel(format_root_text(y_label), fontsize=options.label_font_size)
    ax.set_title(format_root_text(title), pad=12, fontsize=options.title_font_size)
    ax.xaxis.label.set_color(options.text_color)
    ax.yaxis.label.set_color(options.text_color)
    ax.title.set_color(options.text_color)


def selected_colormap(name: str):
    if name == "white-red":
        return LinearSegmentedColormap.from_list(
            "white_to_red",
            ["#ffffff", "#fde0dd", "#fa9fb5", "#dd3497", "#7a0177"],
        )
    if name == "viridis":
        return plt.get_cmap("viridis").copy()
    if name == "magma":
        return plt.get_cmap("magma").copy()
    if name == "gray":
        return plt.get_cmap("Greys").copy()
    return LinearSegmentedColormap.from_list(
        "white_to_blue",
        ["#ffffff", "#d8ecff", "#74add1", "#2b6ca3", "#173b73"],
    )


def color_norm(values, options: PlotOptions):
    if options.z_scale != "log":
        if options.z_min is None and options.z_max is None:
            return None
        return Normalize(vmin=options.z_min, vmax=options.z_max)

    positive = np.asarray(values.compressed(), dtype=float)
    positive = positive[np.isfinite(positive) & (positive > 0)]
    if positive.size == 0:
        return None
    vmin = options.z_min if options.z_min and options.z_min > 0 else float(np.min(positive))
    vmax = options.z_max if options.z_max and options.z_max > 0 else float(np.max(positive))
    return LogNorm(vmin=vmin, vmax=vmax)


def normalize_image_format(image_format: str) -> str:
    if image_format not in {"png", "pdf", "svg"}:
        raise ValueError("Format must be png, pdf, or svg")
    return image_format


def apply_ranges_and_scale(ax, options: PlotOptions) -> None:
    if options.x_scale == "log":
        ax.set_xscale("log")

    if options.y_scale == "log":
        ax.set_yscale("log")

    if options.x_min is not None or options.x_max is not None:
        ax.set_xlim(left=options.x_min, right=options.x_max)

    if options.y_min is not None or options.y_max is not None:
        ax.set_ylim(bottom=options.y_min, top=options.y_max)
    elif options.y_scale == "log":
        bottom, top = ax.get_ylim()
        if bottom <= 0:
            bottom = find_positive_bottom(ax)
        ax.set_ylim(bottom=bottom, top=top)


def find_positive_bottom(ax) -> float:
    positive_values = []
    for line in ax.lines:
        y_data = np.asarray(line.get_ydata(), dtype=float)
        positive_values.extend(y_data[np.isfinite(y_data) & (y_data > 0)])

    if not positive_values:
        return 1e-3
    return min(positive_values) * 0.8


def axis_title(hist, axis_index: int) -> str:
    try:
        return member_text(hist.axis(axis_index), "fTitle")
    except Exception:
        return ""


def member_text(obj, name: str) -> str:
    try:
        value = obj.member(name)
    except Exception:
        return ""
    return str(value or "")


ROOT_SYMBOLS = {
    "#alpha": r"\alpha",
    "#beta": r"\beta",
    "#gamma": r"\gamma",
    "#delta": r"\delta",
    "#Delta": r"\Delta",
    "#epsilon": r"\epsilon",
    "#eta": r"\eta",
    "#theta": r"\theta",
    "#lambda": r"\lambda",
    "#mu": r"\mu",
    "#nu": r"\nu",
    "#pi": r"\pi",
    "#rho": r"\rho",
    "#sigma": r"\sigma",
    "#Sigma": r"\Sigma",
    "#tau": r"\tau",
    "#phi": r"\phi",
    "#Phi": r"\Phi",
    "#chi": r"\chi",
    "#psi": r"\psi",
    "#omega": r"\omega",
    "#Omega": r"\Omega",
    "#pm": r"\pm",
    "#times": r"\times",
    "#rightarrow": r"\rightarrow",
    "#leftarrow": r"\leftarrow",
}


def format_root_text(text: str) -> str:
    if not text:
        return ""

    formatted = text
    for root_symbol, math_symbol in ROOT_SYMBOLS.items():
        formatted = formatted.replace(root_symbol, math_symbol)

    formatted = formatted.replace("#", "\\")
    formatted = re.sub(r"([A-Za-z0-9\\]+(?:[_^]\{[^{}]+\})+)", r"$\1$", formatted)
    return wrap_remaining_math_commands(formatted)


def wrap_remaining_math_commands(text: str) -> str:
    chunks = text.split("$")
    for index in range(0, len(chunks), 2):
        chunks[index] = re.sub(r"(\\[A-Za-z]+)", r"$\1$", chunks[index])
    return "$".join(chunks)
