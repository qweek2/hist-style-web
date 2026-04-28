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
    line_style: str = "solid"
    marker_style: str = "none"
    line_alpha: float = 1.0
    compare_mode: str = "overlay"
    uncertainty_band: bool = False
    fit_enabled: bool = False
    fit_model: str = "gaussian"
    fit_x_min: float | None = None
    fit_x_max: float | None = None
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
    kind = plot_kind(hist)

    plt.style.use("default")
    fig_width, fig_height = figure_size(options.aspect_ratio)
    with style_context(options):
        fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=options.dpi)
        fig.patch.set_facecolor(options.figure_facecolor)
        ax.set_facecolor(options.axes_facecolor)

        draw_object(ax, hist, options, kind)

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


def plot_kind(obj) -> str:
    class_name = obj.classname
    if class_name.startswith("TProfile"):
        return "TProfile"
    if class_name.startswith("TH2"):
        return "TH2"
    if class_name.startswith("TGraph"):
        return "TGraph"
    return "TH1"


def draw_object(ax, obj, options: PlotOptions, kind: str | None = None) -> None:
    kind = kind or plot_kind(obj)
    if kind == "TH2":
        draw_th2(ax, obj, options)
    elif kind == "TGraph":
        draw_tgraph(ax, obj, options)
    elif kind == "TProfile":
        draw_tprofile(ax, obj, options)
    else:
        draw_th1(ax, obj, options)


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
        linestyle=matplotlib_line_style(options.line_style),
        alpha=options.line_alpha,
    )
    draw_markers(ax, centers, values, options, options.line_color)
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
    if options.fit_enabled:
        draw_fit(ax, centers, values, options)

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


def draw_tprofile(ax, hist, options: PlotOptions) -> None:
    values, edges = hist.to_numpy()
    centers = 0.5 * (edges[:-1] + edges[1:])
    errors = profile_errors(hist, values)

    ax.step(
        edges[:-1],
        values,
        where="post",
        color=options.line_color,
        linewidth=options.line_width,
        linestyle=matplotlib_line_style(options.line_style),
        alpha=options.line_alpha,
    )
    draw_markers(ax, centers, values, options, options.line_color)
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
    apply_labels(ax, hist, options, default_y_label="Profile")


def profile_errors(hist, values):
    try:
        errors = np.asarray(hist.errors(), dtype=float)
        if errors.shape == values.shape:
            return errors
    except Exception:
        pass
    return np.zeros_like(values, dtype=float)


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


def draw_tgraph(ax, graph, options: PlotOptions) -> None:
    x_values, y_values, x_errors, y_errors = graph_arrays(graph)
    ax.plot(
        x_values,
        y_values,
        color=options.line_color,
        linewidth=options.line_width,
        linestyle=matplotlib_line_style(options.line_style),
        marker=matplotlib_marker(options.marker_style),
        markersize=max(3, options.line_width * 2),
        alpha=options.line_alpha,
    )
    if options.show_errors and (x_errors is not None or y_errors is not None):
        ax.errorbar(
            x_values,
            y_values,
            xerr=x_errors,
            yerr=y_errors,
            fmt="none",
            ecolor=options.line_color,
            elinewidth=max(0.8, options.line_width * 0.55),
            capsize=1.8,
            alpha=0.85,
        )
    apply_labels(ax, graph, options, default_y_label="y")


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


def render_compare_th1(
    histograms: list[tuple],
    options: PlotOptions | None = None,
    image_format: str = "png",
) -> bytes:
    options = options or PlotOptions()
    image_format = normalize_image_format(image_format)

    plt.style.use("default")
    fig_width, fig_height = figure_size(options.aspect_ratio)
    with style_context(options):
        if options.compare_mode == "overlay":
            fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=options.dpi)
            ratio_ax = None
        else:
            fig, (ax, ratio_ax) = plt.subplots(
                2,
                1,
                figsize=(fig_width, fig_height),
                dpi=options.dpi,
                sharex=True,
                gridspec_kw={"height_ratios": [3, 1], "hspace": 0.08},
            )
        fig.patch.set_facecolor(options.figure_facecolor)
        ax.set_facecolor(options.axes_facecolor)
        if ratio_ax is not None:
            ratio_ax.set_facecolor(options.axes_facecolor)

        colors = plt.rcParams["axes.prop_cycle"].by_key()["color"]
        prepared = [prepared_compare_item(item, index, colors, options) for index, item in enumerate(histograms)]
        reference = prepared[0]
        if ratio_ax is not None:
            validate_compare_bins(prepared)

        for index, item in enumerate(prepared):
            label = item["label"]
            values = item["values"]
            edges = item["edges"]
            centers = item["centers"]
            errors = item["errors"]
            color = item["color"]
            line_style = item["line_style"]
            marker = item["marker"]
            alpha = item["alpha"]
            ax.step(
                edges[:-1],
                values,
                where="post",
                linewidth=options.line_width,
                linestyle=matplotlib_line_style(line_style),
                color=color,
                label=label,
                alpha=alpha,
            )
            if marker and marker != "none":
                ax.plot(
                    centers,
                    values,
                    linestyle="none",
                    marker=matplotlib_marker(marker),
                    markersize=max(3, options.line_width * 1.8),
                    color=color,
                    alpha=alpha,
                )
            if options.show_errors:
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
            if options.uncertainty_band and index == 0:
                ax.fill_between(
                    centers,
                    values - errors,
                    values + errors,
                    step="mid",
                    color=color,
                    alpha=0.18,
                    linewidth=0,
                    label=f"{label} unc.",
                )

            if ratio_ax is not None and index > 0:
                residual, residual_errors, ylabel, baseline = compare_residual(item, reference, options.compare_mode)
                ratio_ax.axhline(baseline, color=options.axis_color, linewidth=0.8, alpha=0.7)
                ratio_ax.step(
                    edges[:-1],
                    residual,
                    where="post",
                    linewidth=max(1.0, options.line_width * 0.8),
                    linestyle=matplotlib_line_style(line_style),
                    color=color,
                    alpha=alpha,
                )
                if marker and marker != "none":
                    ratio_ax.plot(
                        centers,
                        residual,
                        linestyle="none",
                        marker=matplotlib_marker(marker),
                        markersize=max(3, options.line_width * 1.5),
                        color=color,
                        alpha=alpha,
                    )
                if options.show_errors:
                    ratio_ax.errorbar(
                        centers,
                        residual,
                        yerr=residual_errors,
                        fmt="none",
                        ecolor=color,
                        elinewidth=max(0.7, options.line_width * 0.45),
                        capsize=1.4,
                        alpha=0.75,
                    )
                ratio_ax.set_ylabel(ylabel, color=options.text_color, fontsize=options.label_font_size)

        if ratio_ax is not None:
            style_axes(ratio_ax, options)
            ratio_ax.tick_params(axis="x", labelbottom=True)
            apply_ranges_and_scale(ax, options)
            if options.y_scale == "log":
                ratio_ax.set_yscale("linear")
            ax.tick_params(axis="x", labelbottom=False)
        else:
            apply_ranges_and_scale(ax, options)

        apply_labels(ax, prepared[0]["hist"], options, default_y_label="Entries")
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


def compare_item(item):
    if len(item) == 6:
        return item
    if len(item) == 3:
        label, hist, color = item
        return label, hist, color, None, None, None
    label, hist = item
    return label, hist, None, None, None, None


def prepared_compare_item(item, index: int, colors: list[str], options: PlotOptions) -> dict:
    label, hist, custom_color, custom_style, custom_marker, custom_alpha = compare_item(item)
    values, edges = hist.to_numpy()
    widths = np.diff(edges)
    errors = profile_errors(hist, values) if plot_kind(hist) == "TProfile" else np.sqrt(np.clip(values, 0, None))
    if plot_kind(hist) != "TProfile":
        values, errors = normalize_th1(values, errors, widths, options.normalization)
    return {
        "label": label,
        "hist": hist,
        "values": values,
        "edges": edges,
        "centers": 0.5 * (edges[:-1] + edges[1:]),
        "errors": errors,
        "color": custom_color or colors[index % len(colors)],
        "line_style": custom_style or options.line_style,
        "marker": custom_marker or options.marker_style,
        "alpha": float(custom_alpha) if custom_alpha is not None else options.line_alpha,
    }


def validate_compare_bins(items: list[dict]) -> None:
    reference_edges = items[0]["edges"]
    for item in items[1:]:
        if len(item["edges"]) != len(reference_edges) or not np.allclose(item["edges"], reference_edges):
            raise ValueError("Ratio/difference compare requires identical binning")


def compare_residual(item: dict, reference: dict, mode: str):
    values = item["values"].astype(float)
    ref_values = reference["values"].astype(float)
    errors = item["errors"].astype(float)
    ref_errors = reference["errors"].astype(float)
    with np.errstate(divide="ignore", invalid="ignore"):
        if mode == "ratio":
            residual = np.divide(values, ref_values, out=np.full_like(values, np.nan), where=ref_values != 0)
            rel_err_sq = np.divide(errors, values, out=np.zeros_like(values), where=values != 0) ** 2
            rel_ref_sq = np.divide(ref_errors, ref_values, out=np.zeros_like(values), where=ref_values != 0) ** 2
            residual_errors = np.abs(residual) * np.sqrt(rel_err_sq + rel_ref_sq)
            return residual, residual_errors, "Ratio", 1.0
        if mode == "relative_difference":
            diff = values - ref_values
            residual = 100.0 * np.divide(diff, ref_values, out=np.full_like(values, np.nan), where=ref_values != 0)
            residual_errors = 100.0 * np.sqrt(errors**2 + ref_errors**2) / np.where(ref_values != 0, np.abs(ref_values), np.nan)
            return residual, residual_errors, "% diff", 0.0
    residual = values - ref_values
    residual_errors = np.sqrt(errors**2 + ref_errors**2)
    return residual, residual_errors, "Diff", 0.0


def render_panel(
    objects: list[tuple[str, object]],
    options: PlotOptions | None = None,
    image_format: str = "png",
    columns: int = 2,
    shared_x: bool = False,
    shared_y: bool = False,
    equal_ranges: bool = False,
    panel_titles: bool = True,
    global_title: str | None = None,
    spacing: float = 0.25,
) -> bytes:
    options = options or PlotOptions()
    image_format = normalize_image_format(image_format)
    columns = max(1, min(columns, 4))
    rows = int(np.ceil(len(objects) / columns))
    single_width, single_height = figure_size(options.aspect_ratio)
    fig_width = single_width * columns
    fig_height = single_height * rows

    with style_context(options):
        fig, axes = plt.subplots(
            rows,
            columns,
            figsize=(fig_width, fig_height),
            dpi=options.dpi,
            sharex=shared_x,
            sharey=shared_y,
        )
        fig.patch.set_facecolor(options.figure_facecolor)
        axes_array = np.asarray(axes).reshape(-1)
        equal_limits = panel_equal_limits(objects) if equal_ranges else None

        for ax, (path, obj) in zip(axes_array, objects):
            ax.set_facecolor(options.axes_facecolor)
            panel_options = PlotOptions(**{**options.__dict__, "title": path if panel_titles else ""})
            draw_object(ax, obj, panel_options)
            if equal_limits:
                ax.set_xlim(equal_limits[0], equal_limits[1])
                ax.set_ylim(equal_limits[2], equal_limits[3])
            apply_ranges_and_scale(ax, panel_options)
            style_axes(ax, panel_options)

        for ax in axes_array[len(objects):]:
            ax.axis("off")

        if global_title:
            fig.suptitle(format_root_text(global_title), color=options.text_color, fontsize=options.title_font_size)
        fig.tight_layout()
        fig.subplots_adjust(wspace=spacing, hspace=spacing)
        buffer = BytesIO()
        fig.savefig(
            buffer,
            format=image_format,
            bbox_inches="tight",
            facecolor=fig.get_facecolor(),
        )
        plt.close(fig)
    return buffer.getvalue()


def panel_equal_limits(objects: list[tuple[str, object]]):
    x_min_values = []
    x_max_values = []
    y_min_values = []
    y_max_values = []
    for _, obj in objects:
        try:
            kind = plot_kind(obj)
            if kind in {"TH1", "TProfile"}:
                values, edges = obj.to_numpy()
                x_min_values.append(float(edges[0]))
                x_max_values.append(float(edges[-1]))
                y_min_values.append(float(np.nanmin(values)))
                y_max_values.append(float(np.nanmax(values)))
            elif kind == "TGraph":
                x_values, y_values, _, _ = graph_arrays(obj)
                x_min_values.append(float(np.nanmin(x_values)))
                x_max_values.append(float(np.nanmax(x_values)))
                y_min_values.append(float(np.nanmin(y_values)))
                y_max_values.append(float(np.nanmax(y_values)))
        except Exception:
            continue
    if not x_min_values or not y_min_values:
        return None
    return min(x_min_values), max(x_max_values), min(y_min_values), max(y_max_values)


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


def draw_markers(ax, x_values, y_values, options: PlotOptions, color: str) -> None:
    marker = matplotlib_marker(options.marker_style)
    if marker:
        ax.plot(
            x_values,
            y_values,
            linestyle="none",
            marker=marker,
            markersize=max(3, options.line_width * 1.8),
            color=color,
            alpha=options.line_alpha,
        )


def draw_fit(ax, x_values, y_values, options: PlotOptions) -> None:
    mask = np.isfinite(x_values) & np.isfinite(y_values)
    if options.fit_x_min is not None:
        mask &= x_values >= options.fit_x_min
    if options.fit_x_max is not None:
        mask &= x_values <= options.fit_x_max
    if np.count_nonzero(mask) < 3:
        return

    x_fit = x_values[mask].astype(float)
    y_fit = y_values[mask].astype(float)
    order = polynomial_order(options.fit_model)
    if order is not None:
        if len(x_fit) <= order:
            return
        coeffs = np.polyfit(x_fit, y_fit, order)
        x_line = np.linspace(float(np.min(x_fit)), float(np.max(x_fit)), 400)
        y_line = np.polyval(coeffs, x_line)
        label = f"fit: pol{order}"
    elif options.fit_model == "exponential":
        positive = y_fit > 0
        if np.count_nonzero(positive) < 2:
            return
        slope, intercept = np.polyfit(x_fit[positive], np.log(y_fit[positive]), 1)
        x_line = np.linspace(float(np.min(x_fit)), float(np.max(x_fit)), 400)
        y_line = np.exp(intercept + slope * x_line)
        label = "fit: exp"
    else:
        total = float(np.sum(y_fit))
        if total <= 0:
            return
        mean = float(np.sum(x_fit * y_fit) / total)
        sigma = float(np.sqrt(np.sum(y_fit * (x_fit - mean) ** 2) / total))
        if sigma <= 0:
            return
        amplitude = float(np.max(y_fit))
        x_line = np.linspace(float(np.min(x_fit)), float(np.max(x_fit)), 400)
        y_line = amplitude * np.exp(-0.5 * ((x_line - mean) / sigma) ** 2)
        label = f"fit: gaussian, mu={mean:.3g}, sigma={sigma:.3g}"

    ax.plot(
        x_line,
        y_line,
        color=options.line_color,
        linewidth=max(1.0, options.line_width * 0.8),
        linestyle="--",
        alpha=min(1.0, options.line_alpha + 0.1),
        label=label if options.show_legend else None,
    )
    if options.show_legend:
        legend = ax.legend(frameon=False, fontsize=options.tick_font_size)
        for text in legend.get_texts():
            text.set_color(options.text_color)


def polynomial_order(model: str) -> int | None:
    aliases = {"linear": 1, "quadratic": 2, "cubic": 3}
    if model in aliases:
        return aliases[model]
    match = re.fullmatch(r"pol([0-6])", model or "")
    if match:
        return int(match.group(1))
    return None


def matplotlib_line_style(value: str | None) -> str:
    return {
        "solid": "-",
        "dashed": "--",
        "dashdot": "-.",
        "dotted": ":",
    }.get(value or "solid", "-")


def matplotlib_marker(value: str | None) -> str | None:
    return {
        "none": None,
        "circle": "o",
        "square": "s",
        "triangle": "^",
        "diamond": "D",
    }.get(value or "none")


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


def member_float(obj, name: str) -> float:
    try:
        return float(obj.member(name))
    except Exception:
        return 0.0


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
    for root_symbol, math_symbol in sorted(ROOT_SYMBOLS.items(), key=lambda item: len(item[0]), reverse=True):
        formatted = formatted.replace(root_symbol, f"${math_symbol}$")

    formatted = formatted.replace("#", "\\")
    formatted = re.sub(r"([A-Za-z0-9\\]+(?:[_^]\{[^{}]+\})+)", r"$\1$", formatted)
    return wrap_remaining_math_commands(formatted)


def wrap_remaining_math_commands(text: str) -> str:
    chunks = text.split("$")
    for index in range(0, len(chunks), 2):
        chunks[index] = re.sub(r"(\\[A-Za-z]+)", r"$\1$", chunks[index])
    return "$".join(chunks)
