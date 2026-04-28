const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const statusBox = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");
const compareButton = document.querySelector("#compareButton");
const histList = document.querySelector("#histList");
const plotImage = document.querySelector("#plotImage");
const summaryLine = document.querySelector("#summaryLine");
const selectedName = document.querySelector("#selectedName");
const downloadLink = document.querySelector("#downloadLink");
const formatInput = document.querySelector("#formatInput");
const exportAllButton = document.querySelector("#exportAllButton");
const saveStyleButton = document.querySelector("#saveStyleButton");
const styleFileInput = document.querySelector("#styleFileInput");
const stylePresetInput = document.querySelector("#stylePresetInput");
const dpiInput = document.querySelector("#dpiInput");
const aspectRatioInput = document.querySelector("#aspectRatioInput");
const lineWidthInput = document.querySelector("#lineWidthInput");
const lineColorInput = document.querySelector("#lineColorInput");
const colormapInput = document.querySelector("#colormapInput");
const normalizationInput = document.querySelector("#normalizationInput");
const showErrorsInput = document.querySelector("#showErrorsInput");
const showLegendInput = document.querySelector("#showLegendInput");
const customInput = document.querySelector("#customInput");
const titleInput = document.querySelector("#titleInput");
const xLabelInput = document.querySelector("#xLabelInput");
const yLabelInput = document.querySelector("#yLabelInput");
const titleFontSizeInput = document.querySelector("#titleFontSizeInput");
const labelFontSizeInput = document.querySelector("#labelFontSizeInput");
const tickFontSizeInput = document.querySelector("#tickFontSizeInput");
const xMinInput = document.querySelector("#xMinInput");
const xMaxInput = document.querySelector("#xMaxInput");
const yMinInput = document.querySelector("#yMinInput");
const yMaxInput = document.querySelector("#yMaxInput");
const zMinInput = document.querySelector("#zMinInput");
const zMaxInput = document.querySelector("#zMaxInput");
const showSummaryInput = document.querySelector("#showSummaryInput");
const includeSummaryInput = document.querySelector("#includeSummaryInput");
const scaleControls = document.querySelectorAll(".segmented[data-scale]");

let currentFileId = null;
let currentHist = null;
let refreshTimer = null;
let allHistograms = [];
let comparePaths = new Set();
let compareMode = false;
let compareObjectUrl = null;

const globalSettings = {
  stylePreset: "journal",
  dpi: "200",
  aspectRatio: "16:10",
  xScale: "linear",
  yScale: "linear",
  zScale: "linear",
  lineWidth: "2",
  lineColor: "#1f77b4",
  colormap: "white-blue",
  normalization: "raw",
  showErrors: true,
  showLegend: true,
  title: "",
  xLabel: "",
  yLabel: "",
  titleFontSize: "13",
  labelFontSize: "11",
  tickFontSize: "10",
  xMin: "",
  xMax: "",
  yMin: "",
  yMax: "",
  zMin: "",
  zMax: "",
  showSummary: true,
  includeSummary: false,
  fontFamily: "Arial, Helvetica, Liberation Sans, DejaVu Sans",
  figureFacecolor: "#ffffff",
  axesFacecolor: "#ffffff",
  textColor: "#111827",
  axisColor: "#111827",
  tickDirection: "out",
};
const histSettings = new Map();

const PRESETS = {
  journal: {
    stylePreset: "journal",
    dpi: "300",
    aspectRatio: "16:10",
    lineWidth: "1.5",
    lineColor: "#111827",
    colormap: "white-blue",
    titleFontSize: "11",
    labelFontSize: "9",
    tickFontSize: "8",
    showLegend: true,
    fontFamily: "Arial, Helvetica, Liberation Sans, DejaVu Sans",
    figureFacecolor: "#ffffff",
    axesFacecolor: "#ffffff",
    textColor: "#111827",
    axisColor: "#111827",
    tickDirection: "out",
  },
  presentation: {
    stylePreset: "presentation",
    dpi: "200",
    aspectRatio: "16:9",
    lineWidth: "3",
    lineColor: "#2563eb",
    colormap: "viridis",
    titleFontSize: "22",
    labelFontSize: "17",
    tickFontSize: "14",
    showLegend: true,
    fontFamily: "Inter, Avenir Next, Aptos, Segoe UI, Arial, DejaVu Sans",
    figureFacecolor: "#ffffff",
    axesFacecolor: "#ffffff",
    textColor: "#111827",
    axisColor: "#111827",
    tickDirection: "out",
  },
  hep: {
    stylePreset: "hep",
    dpi: "300",
    aspectRatio: "4:3",
    lineWidth: "2",
    lineColor: "#000000",
    colormap: "white-blue",
    titleFontSize: "13",
    labelFontSize: "12",
    tickFontSize: "11",
    showLegend: true,
    fontFamily: "Helvetica, Arial, Liberation Sans, DejaVu Sans",
    figureFacecolor: "#ffffff",
    axesFacecolor: "#ffffff",
    textColor: "#000000",
    axisColor: "#000000",
    tickDirection: "in",
  },
  nature: {
    stylePreset: "nature",
    dpi: "300",
    aspectRatio: "16:10",
    lineWidth: "1.2",
    lineColor: "#000000",
    colormap: "viridis",
    titleFontSize: "7",
    labelFontSize: "7",
    tickFontSize: "6",
    showLegend: true,
    fontFamily: "Arial, Helvetica, Liberation Sans, DejaVu Sans",
    figureFacecolor: "#ffffff",
    axesFacecolor: "#ffffff",
    textColor: "#000000",
    axisColor: "#000000",
    tickDirection: "out",
  },
  dark: {
    stylePreset: "dark",
    dpi: "200",
    aspectRatio: "16:9",
    lineWidth: "3",
    lineColor: "#60a5fa",
    colormap: "magma",
    titleFontSize: "22",
    labelFontSize: "17",
    tickFontSize: "14",
    showLegend: true,
    fontFamily: "Inter, Avenir Next, Aptos, Segoe UI, Arial, DejaVu Sans",
    figureFacecolor: "#0b1020",
    axesFacecolor: "#0b1020",
    textColor: "#f8fafc",
    axisColor: "#cbd5e1",
    tickDirection: "out",
  },
};

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) uploadFile(fileInput.files[0]);
});

[dpiInput, aspectRatioInput, lineWidthInput, lineColorInput, colormapInput, normalizationInput, showErrorsInput, showLegendInput, titleInput, xLabelInput, yLabelInput, titleFontSizeInput, labelFontSizeInput, tickFontSizeInput, xMinInput, xMaxInput, yMinInput, yMaxInput, zMinInput, zMaxInput, showSummaryInput, includeSummaryInput].forEach((input) => {
  input.addEventListener("input", () => {
    saveSettingsFromForm();
    refreshPlotSoon();
  });
  input.addEventListener("change", () => {
    saveSettingsFromForm();
    refreshPlotSoon();
  });
});

stylePresetInput.addEventListener("change", () => {
  applyPreset(stylePresetInput.value);
  loadSettingsToForm();
  refreshPlotSoon();
});

formatInput.addEventListener("change", () => {
  if (compareMode) {
    compareSelected();
  } else {
    updateDownloadLink();
  }
});
exportAllButton.addEventListener("click", exportAll);
compareButton.addEventListener("click", compareSelected);
saveStyleButton.addEventListener("click", saveStyle);
styleFileInput.addEventListener("change", loadStyle);
searchInput.addEventListener("input", () => renderHistogramList(filteredHistograms()));

scaleControls.forEach((control) => {
  control.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button) return;
    setScaleControl(control.dataset.scale, button.dataset.value);
    saveSettingsFromForm();
    refreshPlotSoon();
  });
});

customInput.addEventListener("change", () => {
  if (!currentHist) return;
  if (customInput.checked && !histSettings.has(currentHist.path)) {
    histSettings.set(currentHist.path, { ...globalSettings });
  }
  if (!customInput.checked) {
    histSettings.delete(currentHist.path);
  }
  loadSettingsToForm();
  refreshPlotSoon();
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("active");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("active");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("active");
  const file = event.dataTransfer.files[0];
  if (file) uploadFile(file);
});

async function uploadFile(file) {
  statusBox.textContent = "Uploading...";
  histList.innerHTML = "";
  plotImage.removeAttribute("src");
  summaryLine.textContent = "";
  selectedName.textContent = "Select a histogram";
  downloadLink.classList.add("disabled");

  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    statusBox.textContent = await errorMessage(response);
    return;
  }

  const data = await response.json();
  currentFileId = data.fileId;
  currentHist = null;
  allHistograms = data.histograms;
  comparePaths.clear();
  compareMode = false;
  histSettings.clear();
  customInput.checked = false;
  customInput.disabled = true;
  exportAllButton.disabled = false;
  loadSettingsToForm();
  statusBox.textContent = `${data.histograms.length} histograms found`;
  renderHistogramList(filteredHistograms());
}

function renderHistogramList(histograms) {
  histList.innerHTML = "";

  for (const hist of histograms) {
    const button = document.createElement("button");
    button.className = "hist-item";
    button.type = "button";
    button.innerHTML = `
      <input class="compare-check" type="checkbox" ${hist.kind === "TH1" ? "" : "disabled"} ${comparePaths.has(hist.path) ? "checked" : ""} />
      <span>${escapeHtml(hist.path)}</span>
      <small>${escapeHtml(hist.className)}</small>
    `;
    button.querySelector(".compare-check").addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCompare(hist.path, event.target.checked);
    });
    button.addEventListener("click", () => selectHistogram(hist, button));
    histList.appendChild(button);
  }
  updateCompareButton();
}

function selectHistogram(hist, button) {
  document.querySelectorAll(".hist-item.active").forEach((item) => {
    item.classList.remove("active");
  });
  button.classList.add("active");

  currentHist = hist;
  compareMode = false;
  customInput.disabled = false;
  customInput.checked = histSettings.has(hist.path);
  loadSettingsToForm();

  selectedName.textContent = hist.path;
  downloadLink.classList.remove("disabled");
  refreshPlot();
}

function filteredHistograms() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return allHistograms;
  return allHistograms.filter((hist) => {
    return hist.path.toLowerCase().includes(query) || hist.className.toLowerCase().includes(query);
  });
}

function toggleCompare(path, checked) {
  if (checked) {
    comparePaths.add(path);
  } else {
    comparePaths.delete(path);
  }
  updateCompareButton();
}

function updateCompareButton() {
  compareButton.disabled = comparePaths.size < 2;
  compareButton.textContent = `Compare selected (${comparePaths.size})`;
}

function refreshPlotSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshPlot, 250);
}

function refreshPlot() {
  if (compareMode) {
    compareSelected();
    return;
  }

  if (!currentFileId || !currentHist) return;

  const url = plotUrl(currentHist);
  plotImage.src = url;
  updateDownloadLink();
  refreshSummary();
}

function updateDownloadLink() {
  if (!currentFileId || !currentHist) return;
  const imageFormat = formatInput.value;
  downloadLink.href = plotUrl(currentHist, imageFormat);
  downloadLink.download = `${safeName(currentHist.path)}.${imageFormat}`;
}

async function refreshSummary() {
  if (!showSummaryInput.checked) {
    summaryLine.textContent = "";
    summaryLine.hidden = true;
    return;
  }
  summaryLine.hidden = false;
  if (compareMode) {
    summaryLine.textContent = `Compared: ${comparePaths.size} histograms`;
    return;
  }
  if (!currentFileId || !currentHist) return;

  const params = new URLSearchParams();
  params.set("path", currentHist.path);

  const response = await fetch(`/api/files/${currentFileId}/summary?${params.toString()}`);
  if (!response.ok) {
    summaryLine.textContent = await errorMessage(response);
    return;
  }

  summaryLine.textContent = formatSummary(await response.json());
}

function formatSummary(summary) {
  if (summary.kind === "TH2") {
    return [
      `Entries: ${formatNumber(summary.entries)}`,
      `Integral: ${formatNumber(summary.integral)}`,
      `Mean X/Y: ${formatNumber(summary.meanX)} / ${formatNumber(summary.meanY)}`,
      `RMS X/Y: ${formatNumber(summary.rmsX)} / ${formatNumber(summary.rmsY)}`,
    ].join(" | ");
  }

  return [
    `Entries: ${formatNumber(summary.entries)}`,
    `Integral: ${formatNumber(summary.integral)}`,
    `Mean: ${formatNumber(summary.mean)}`,
    `RMS: ${formatNumber(summary.rms)}`,
  ].join(" | ");
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, {
    maximumSignificantDigits: 5,
  });
}

function plotUrl(hist, imageFormat = "png") {
  const settings = effectiveSettings(hist);
  const params = new URLSearchParams();
  params.set("path", hist.path);
  params.set("dpi", settings.dpi);
  params.set("aspect_ratio", settings.aspectRatio);
  params.set("x_scale", settings.xScale);
  params.set("y_scale", settings.yScale);
  params.set("z_scale", settings.zScale);
  params.set("line_width", settings.lineWidth);
  params.set("line_color", settings.lineColor);
  params.set("colormap", settings.colormap);
  params.set("normalization", settings.normalization);
  params.set("show_errors", settings.showErrors ? "true" : "false");
  params.set("show_legend", settings.showLegend ? "true" : "false");
  params.set("include_summary", settings.includeSummary ? "true" : "false");
  params.set("font_family", settings.fontFamily);
  params.set("figure_facecolor", settings.figureFacecolor);
  params.set("axes_facecolor", settings.axesFacecolor);
  params.set("text_color", settings.textColor);
  params.set("axis_color", settings.axisColor);
  params.set("tick_direction", settings.tickDirection);
  addTextParam(params, "title", settings.title);
  addTextParam(params, "x_label", settings.xLabel);
  addTextParam(params, "y_label", settings.yLabel);
  params.set("title_font_size", integerSetting(settings.titleFontSize, "13"));
  params.set("label_font_size", integerSetting(settings.labelFontSize, "11"));
  params.set("tick_font_size", integerSetting(settings.tickFontSize, "10"));
  addNumberParam(params, "x_min", settings.xMin);
  addNumberParam(params, "x_max", settings.xMax);
  addNumberParam(params, "y_min", settings.yMin);
  addNumberParam(params, "y_max", settings.yMax);
  addNumberParam(params, "z_min", settings.zMin);
  addNumberParam(params, "z_max", settings.zMax);
  params.set("image_format", imageFormat);
  return `/api/files/${currentFileId}/plot?${params.toString()}`;
}

function addNumberParam(params, name, value) {
  if (value !== "" && Number.isFinite(Number(value))) {
    params.set(name, value);
  }
}

function addTextParam(params, name, value) {
  if (value !== "") {
    params.set(name, value);
  }
}

function integerSetting(value, fallback) {
  return Number.isInteger(Number(value)) && value !== "" ? value : fallback;
}

function effectiveSettings(hist) {
  return histSettings.get(hist.path) || globalSettings;
}

function activeSettingsTarget() {
  if (currentHist && customInput.checked) {
    if (!histSettings.has(currentHist.path)) {
      histSettings.set(currentHist.path, { ...globalSettings });
    }
    return histSettings.get(currentHist.path);
  }
  return globalSettings;
}

function saveSettingsFromForm() {
  const target = activeSettingsTarget();
  target.stylePreset = stylePresetInput.value;
  target.dpi = dpiInput.value;
  target.aspectRatio = aspectRatioInput.value;
  target.xScale = scaleValue("x");
  target.yScale = scaleValue("y");
  target.zScale = scaleValue("z");
  target.lineWidth = lineWidthInput.value;
  target.lineColor = lineColorInput.value;
  target.colormap = colormapInput.value;
  target.normalization = normalizationInput.value;
  target.showErrors = showErrorsInput.checked;
  target.showLegend = showLegendInput.checked;
  target.title = titleInput.value;
  target.xLabel = xLabelInput.value;
  target.yLabel = yLabelInput.value;
  target.titleFontSize = integerSetting(titleFontSizeInput.value, "13");
  target.labelFontSize = integerSetting(labelFontSizeInput.value, "11");
  target.tickFontSize = integerSetting(tickFontSizeInput.value, "10");
  target.xMin = xMinInput.value;
  target.xMax = xMaxInput.value;
  target.yMin = yMinInput.value;
  target.yMax = yMaxInput.value;
  target.zMin = zMinInput.value;
  target.zMax = zMaxInput.value;
  target.showSummary = showSummaryInput.checked;
  target.includeSummary = includeSummaryInput.checked;
}

function loadSettingsToForm() {
  const settings = currentHist ? effectiveSettings(currentHist) : globalSettings;
  stylePresetInput.value = settings.stylePreset || "journal";
  dpiInput.value = settings.dpi;
  aspectRatioInput.value = settings.aspectRatio;
  setScaleControl("x", settings.xScale);
  setScaleControl("y", settings.yScale);
  setScaleControl("z", settings.zScale);
  lineWidthInput.value = settings.lineWidth;
  lineColorInput.value = settings.lineColor;
  colormapInput.value = settings.colormap;
  normalizationInput.value = settings.normalization;
  showErrorsInput.checked = settings.showErrors;
  showLegendInput.checked = settings.showLegend;
  titleInput.value = settings.title;
  xLabelInput.value = settings.xLabel;
  yLabelInput.value = settings.yLabel;
  titleFontSizeInput.value = settings.titleFontSize;
  labelFontSizeInput.value = settings.labelFontSize;
  tickFontSizeInput.value = settings.tickFontSize;
  xMinInput.value = settings.xMin;
  xMaxInput.value = settings.xMax;
  yMinInput.value = settings.yMin;
  yMaxInput.value = settings.yMax;
  zMinInput.value = settings.zMin;
  zMaxInput.value = settings.zMax;
  showSummaryInput.checked = settings.showSummary;
  includeSummaryInput.checked = settings.includeSummary;
}

function applyPreset(name) {
  const target = activeSettingsTarget();
  Object.assign(target, PRESETS[name] || PRESETS.journal);
}

async function compareSelected() {
  if (!currentFileId || comparePaths.size < 2) return;

  saveSettingsFromForm();
  compareMode = true;
  selectedName.textContent = "Compare selected TH1";
  const imageFormat = formatInput.value;
  try {
    const blob = await fetchCompareImage("png");
    setPlotBlob(blob);
    const downloadBlob = await fetchCompareImage(imageFormat);
    setDownloadBlob(downloadBlob, `compare.${imageFormat}`);
    refreshSummary();
  } catch (error) {
    statusBox.textContent = error.message;
  }
}

async function fetchCompareImage(imageFormat) {
  const response = await fetch(`/api/files/${currentFileId}/compare`, {
    method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: imageFormat,
        paths: Array.from(comparePaths),
        settings: formSettings(),
      }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return await response.blob();
}

function setPlotBlob(blob) {
  if (compareObjectUrl) {
    URL.revokeObjectURL(compareObjectUrl);
  }
  compareObjectUrl = URL.createObjectURL(blob);
  plotImage.src = compareObjectUrl;
}

function setDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.classList.remove("disabled");
}

function formSettings() {
  saveSettingsFromForm();
  return {
    ...activeSettingsTarget(),
    stylePreset: stylePresetInput.value,
    dpi: dpiInput.value,
    aspectRatio: aspectRatioInput.value,
    xScale: scaleValue("x"),
    yScale: scaleValue("y"),
    zScale: scaleValue("z"),
    lineWidth: lineWidthInput.value,
    lineColor: lineColorInput.value,
    colormap: colormapInput.value,
    normalization: normalizationInput.value,
    showErrors: showErrorsInput.checked,
    showLegend: showLegendInput.checked,
    title: titleInput.value,
    xLabel: xLabelInput.value,
    yLabel: yLabelInput.value,
    titleFontSize: integerSetting(titleFontSizeInput.value, "13"),
    labelFontSize: integerSetting(labelFontSizeInput.value, "11"),
    tickFontSize: integerSetting(tickFontSizeInput.value, "10"),
    xMin: xMinInput.value,
    xMax: xMaxInput.value,
    yMin: yMinInput.value,
    yMax: yMaxInput.value,
    zMin: zMinInput.value,
    zMax: zMaxInput.value,
    showSummary: showSummaryInput.checked,
    includeSummary: includeSummaryInput.checked,
  };
}

async function exportAll() {
  if (!currentFileId) return;

  exportAllButton.disabled = true;
  exportAllButton.textContent = "Exporting...";
  try {
    const response = await fetch(`/api/files/${currentFileId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stylePayload(formatInput.value)),
    });
    if (!response.ok) {
      statusBox.textContent = await errorMessage(response);
      return;
    }
    downloadBlob(await response.blob(), `histograms_${formatInput.value}.zip`);
  } finally {
    exportAllButton.disabled = false;
    exportAllButton.textContent = "Export all";
  }
}

function saveStyle() {
  const blob = new Blob([JSON.stringify(stylePayload(formatInput.value), null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "histogram_style.json");
}

async function loadStyle() {
  const file = styleFileInput.files[0];
  if (!file) return;

  const payload = JSON.parse(await file.text());
  Object.assign(globalSettings, payload.globalSettings || {});
  histSettings.clear();
  for (const [path, settings] of Object.entries(payload.histSettings || {})) {
    histSettings.set(path, settings);
  }
  if (payload.format) {
    formatInput.value = payload.format;
  }
  customInput.checked = currentHist ? histSettings.has(currentHist.path) : false;
  loadSettingsToForm();
  refreshPlotSoon();
  styleFileInput.value = "";
}

function stylePayload(imageFormat) {
  saveSettingsFromForm();
  return {
    version: 1,
    format: imageFormat,
    globalSettings: { ...globalSettings },
    histSettings: Object.fromEntries(histSettings),
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function scaleValue(axis) {
  const activeButton = document.querySelector(`.segmented[data-scale="${axis}"] button.active`);
  return activeButton ? activeButton.dataset.value : "linear";
}

function setScaleControl(axis, value) {
  document.querySelectorAll(`.segmented[data-scale="${axis}"] button`).forEach((button) => {
    button.classList.toggle("active", button.dataset.value === value);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}

function safeName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}

async function errorMessage(response) {
  try {
    const data = await response.json();
    return data.detail || response.statusText;
  } catch {
    return await response.text();
  }
}
