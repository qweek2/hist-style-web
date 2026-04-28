const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const statusBox = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");
const compareButton = document.querySelector("#compareButton");
const previewPanelButton = document.querySelector("#previewPanelButton");
const panelButton = document.querySelector("#panelButton");
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
const lineStyleInput = document.querySelector("#lineStyleInput");
const markerStyleInput = document.querySelector("#markerStyleInput");
const lineAlphaInput = document.querySelector("#lineAlphaInput");
const colormapInput = document.querySelector("#colormapInput");
const normalizationInput = document.querySelector("#normalizationInput");
const showErrorsInput = document.querySelector("#showErrorsInput");
const showLegendInput = document.querySelector("#showLegendInput");
const uncertaintyBandInput = document.querySelector("#uncertaintyBandInput");
const compareModeInput = document.querySelector("#compareModeInput");
const fitEnabledInput = document.querySelector("#fitEnabledInput");
const fitModelInput = document.querySelector("#fitModelInput");
const fitXMinInput = document.querySelector("#fitXMinInput");
const fitXMaxInput = document.querySelector("#fitXMaxInput");
const customInput = document.querySelector("#customInput");
const titleInput = document.querySelector("#titleInput");
const xLabelInput = document.querySelector("#xLabelInput");
const yLabelInput = document.querySelector("#yLabelInput");
const compareLabelsInput = document.querySelector("#compareLabelsInput");
const legendEditor = document.querySelector("#legendEditor");
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
const panelColumnsInput = document.querySelector("#panelColumnsInput");
const panelSharedXInput = document.querySelector("#panelSharedXInput");
const panelSharedYInput = document.querySelector("#panelSharedYInput");
const panelEqualRangesInput = document.querySelector("#panelEqualRangesInput");
const panelTitlesInput = document.querySelector("#panelTitlesInput");
const panelSpacingInput = document.querySelector("#panelSpacingInput");
const panelGlobalTitleInput = document.querySelector("#panelGlobalTitleInput");
const objectInfo = document.querySelector("#objectInfo");
const scaleControls = document.querySelectorAll(".segmented[data-scale]");

let currentFileId = null;
let currentHist = null;
let refreshTimer = null;
let allHistograms = [];
let comparePaths = new Set();
let compareMode = false;
let panelMode = false;
let compareObjectUrl = null;
const legendSettings = new Map();

const globalSettings = {
  stylePreset: "journal",
  dpi: "200",
  aspectRatio: "16:10",
  xScale: "linear",
  yScale: "linear",
  zScale: "linear",
  lineWidth: "2",
  lineColor: "#1f77b4",
  lineStyle: "solid",
  markerStyle: "none",
  lineAlpha: "1",
  colormap: "white-blue",
  normalization: "raw",
  showErrors: true,
  showLegend: true,
  uncertaintyBand: false,
  compareMode: "overlay",
  fitEnabled: false,
  fitModel: "gaussian",
  fitXMin: "",
  fitXMax: "",
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
    lineStyle: "solid",
    markerStyle: "none",
    lineAlpha: "1",
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
    lineStyle: "solid",
    markerStyle: "none",
    lineAlpha: "1",
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
    lineStyle: "solid",
    markerStyle: "none",
    lineAlpha: "1",
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
    lineStyle: "solid",
    markerStyle: "none",
    lineAlpha: "1",
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
    lineStyle: "solid",
    markerStyle: "none",
    lineAlpha: "1",
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

[dpiInput, aspectRatioInput, lineWidthInput, lineColorInput, lineStyleInput, markerStyleInput, lineAlphaInput, colormapInput, normalizationInput, showErrorsInput, showLegendInput, uncertaintyBandInput, compareModeInput, fitEnabledInput, fitModelInput, fitXMinInput, fitXMaxInput, titleInput, xLabelInput, yLabelInput, compareLabelsInput, titleFontSizeInput, labelFontSizeInput, tickFontSizeInput, xMinInput, xMaxInput, yMinInput, yMaxInput, zMinInput, zMaxInput, showSummaryInput, includeSummaryInput, panelSharedXInput, panelSharedYInput, panelEqualRangesInput, panelTitlesInput, panelSpacingInput, panelGlobalTitleInput].forEach((input) => {
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
  } else if (panelMode) {
    previewPanel();
  } else {
    updateDownloadLink();
  }
});
exportAllButton.addEventListener("click", exportAll);
compareButton.addEventListener("click", compareSelected);
previewPanelButton.addEventListener("click", previewPanel);
panelButton.addEventListener("click", exportPanel);
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
  legendSettings.clear();
  compareMode = false;
  panelMode = false;
  histSettings.clear();
  customInput.checked = false;
  customInput.disabled = true;
  exportAllButton.disabled = false;
  loadSettingsToForm();
  objectInfo.textContent = "Select an object";
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
      <input class="compare-check" type="checkbox" ${comparePaths.has(hist.path) ? "checked" : ""} />
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
  renderLegendEditor();
}

function selectHistogram(hist, button) {
  document.querySelectorAll(".hist-item.active").forEach((item) => {
    item.classList.remove("active");
  });
  button.classList.add("active");

  currentHist = hist;
  compareMode = false;
  panelMode = false;
  customInput.disabled = false;
  customInput.checked = histSettings.has(hist.path);
  loadSettingsToForm();

  selectedName.textContent = hist.path;
  downloadLink.classList.remove("disabled");
  refreshObjectInfo(hist.path);
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
  renderLegendEditor();
}

function updateCompareButton() {
  const compareCount = selectedComparePaths().length;
  compareButton.disabled = compareCount < 2;
  compareButton.textContent = `Compare selected (${compareCount})`;
  panelButton.disabled = comparePaths.size < 1;
  panelButton.textContent = `Export panel (${comparePaths.size})`;
  previewPanelButton.disabled = comparePaths.size < 1;
  previewPanelButton.textContent = `Preview panel (${comparePaths.size})`;
}

function selectedComparePaths() {
  return Array.from(comparePaths).filter((path) => {
    const hist = allHistograms.find((item) => item.path === path);
    return hist && (hist.kind === "TH1" || hist.kind === "TProfile");
  });
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
  if (panelMode) {
    previewPanel();
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
  if (compareMode || panelMode) return;
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
  if (panelMode) {
    summaryLine.textContent = `Panel: ${comparePaths.size} objects`;
    return;
  }
  if (!currentFileId || !currentHist) return;

  const params = new URLSearchParams();
  params.set("path", currentHist.path);

  const response = await fetch(`/api/files/${currentFileId}/summary?${params.toString()}`);
  if (!response.ok) {
    summaryLine.textContent = `Failed to summarize ${currentHist.path}: ${await errorMessage(response)}`;
    return;
  }

  summaryLine.textContent = formatSummary(await response.json());
}

async function refreshObjectInfo(path) {
  objectInfo.textContent = "Loading...";
  const params = new URLSearchParams();
  params.set("path", path);
  const response = await fetch(`/api/files/${currentFileId}/info?${params.toString()}`);
  if (!response.ok) {
    objectInfo.textContent = `Failed to load info for ${path}: ${await errorMessage(response)}`;
    return;
  }
  objectInfo.innerHTML = formatObjectInfo(await response.json());
}

function formatObjectInfo(info) {
  const rows = [
    ["Path", info.path],
    ["Class", info.className],
    ["Kind", info.kind],
    ["Title", info.title || "-"],
  ];
  if (info.entries !== undefined) rows.push(["Entries", formatNumber(info.entries)]);
  if (info.points !== undefined) rows.push(["Points", formatNumber(info.points)]);
  if (info.binsX !== undefined) rows.push(["Bins X", info.binsX]);
  if (info.binsY !== undefined) rows.push(["Bins Y", info.binsY]);
  if (info.xMin !== undefined) rows.push(["X range", `${formatNumber(info.xMin)} .. ${formatNumber(info.xMax)}`]);
  if (info.yMin !== undefined) rows.push(["Y range", `${formatNumber(info.yMin)} .. ${formatNumber(info.yMax)}`]);
  if (info.xTitle) rows.push(["X title", info.xTitle]);
  if (info.yTitle) rows.push(["Y title", info.yTitle]);
  return rows.map(([key, value]) => `<div><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></div>`).join("");
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
  params.set("line_style", settings.lineStyle);
  params.set("marker_style", settings.markerStyle);
  params.set("line_alpha", numberSetting(settings.lineAlpha, "1"));
  params.set("colormap", settings.colormap);
  params.set("normalization", settings.normalization);
  params.set("show_errors", settings.showErrors ? "true" : "false");
  params.set("show_legend", settings.showLegend ? "true" : "false");
  params.set("uncertainty_band", settings.uncertaintyBand ? "true" : "false");
  params.set("fit_enabled", settings.fitEnabled ? "true" : "false");
  params.set("fit_model", settings.fitModel);
  addNumberParam(params, "fit_x_min", settings.fitXMin);
  addNumberParam(params, "fit_x_max", settings.fitXMax);
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

function numberSetting(value, fallback) {
  return Number.isFinite(Number(value)) && value !== "" ? value : fallback;
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
  target.lineStyle = lineStyleInput.value;
  target.markerStyle = markerStyleInput.value;
  target.lineAlpha = lineAlphaInput.value;
  target.colormap = colormapInput.value;
  target.normalization = normalizationInput.value;
  target.showErrors = showErrorsInput.checked;
  target.showLegend = showLegendInput.checked;
  target.uncertaintyBand = uncertaintyBandInput.checked;
  target.compareMode = compareModeInput.value;
  target.fitEnabled = fitEnabledInput.checked;
  target.fitModel = fitModelInput.value;
  target.fitXMin = fitXMinInput.value;
  target.fitXMax = fitXMaxInput.value;
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
  lineStyleInput.value = settings.lineStyle || "solid";
  markerStyleInput.value = settings.markerStyle || "none";
  lineAlphaInput.value = settings.lineAlpha || "1";
  colormapInput.value = settings.colormap;
  normalizationInput.value = settings.normalization;
  showErrorsInput.checked = settings.showErrors;
  showLegendInput.checked = settings.showLegend;
  uncertaintyBandInput.checked = Boolean(settings.uncertaintyBand);
  compareModeInput.value = settings.compareMode || "overlay";
  fitEnabledInput.checked = Boolean(settings.fitEnabled);
  fitModelInput.value = settings.fitModel || "gaussian";
  fitXMinInput.value = settings.fitXMin || "";
  fitXMaxInput.value = settings.fitXMax || "";
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
  const paths = selectedComparePaths();
  if (paths.length < 2) return;

  saveSettingsFromForm();
  compareMode = true;
  panelMode = false;
  selectedName.textContent = "Compare selected TH1/TProfile";
  const imageFormat = formatInput.value;
  try {
    const blob = await fetchCompareImage("png", paths);
    setPlotBlob(blob);
    const downloadBlob = await fetchCompareImage(imageFormat, paths);
    setDownloadBlob(downloadBlob, `compare.${imageFormat}`);
    refreshSummary();
  } catch (error) {
    statusBox.textContent = `Failed to compare selected objects: ${error.message}`;
  }
}

async function previewPanel() {
  if (!currentFileId || comparePaths.size < 1) return;

  saveSettingsFromForm();
  compareMode = false;
  panelMode = true;
  selectedName.textContent = "Panel preview";
  const imageFormat = formatInput.value;
  try {
    const blob = await fetchPanelImage("png");
    setPlotBlob(blob);
    const downloadBlob = await fetchPanelImage(imageFormat);
    setDownloadBlob(downloadBlob, `panel.${imageFormat}`);
    refreshSummary();
  } catch (error) {
    statusBox.textContent = `Failed to render panel: ${error.message}`;
  }
}

async function fetchPanelImage(imageFormat) {
  const response = await fetch(`/api/files/${currentFileId}/panel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: imageFormat,
      paths: Array.from(comparePaths),
      columns: panelColumnsInput.value,
      sharedX: panelSharedXInput.checked,
      sharedY: panelSharedYInput.checked,
      equalRanges: panelEqualRangesInput.checked,
      panelTitles: panelTitlesInput.checked,
      globalTitle: panelGlobalTitleInput.value,
      spacing: panelSpacingInput.value,
      settings: formSettings(),
    }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return await response.blob();
}

async function fetchCompareImage(imageFormat, paths) {
  const response = await fetch(`/api/files/${currentFileId}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: imageFormat,
      paths,
      labels: compareLabels(paths),
      colors: compareColors(paths),
      styles: compareStyles(paths),
      markers: compareMarkers(paths),
      alphas: compareAlphas(paths),
      settings: formSettings(),
    }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return await response.blob();
}

function compareLabels(paths) {
  const labels = compareLabelsInput.value.split(/\r?\n/).map((label) => label.trim());
  return paths.map((path, index) => {
    const row = legendSettings.get(path);
    return row?.label || labels[index] || path;
  });
}

function compareColors(paths) {
  return paths.map((path) => legendSettings.get(path)?.color || "");
}

function compareStyles(paths) {
  return paths.map((path) => legendSettings.get(path)?.style || "");
}

function compareMarkers(paths) {
  return paths.map((path) => legendSettings.get(path)?.marker || "");
}

function compareAlphas(paths) {
  return paths.map((path) => legendSettings.get(path)?.alpha || "");
}

function renderLegendEditor() {
  const paths = selectedComparePaths();
  legendEditor.innerHTML = "";
  if (!paths.length) {
    legendEditor.textContent = "Select TH1/TProfile objects to edit legend labels.";
    return;
  }

  for (const path of paths) {
    if (!legendSettings.has(path)) {
      legendSettings.set(path, { label: "", color: "", style: "solid", marker: "none", alpha: "1" });
    }
    const settings = legendSettings.get(path);
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `
      <span title="${escapeHtml(path)}">${escapeHtml(path)}</span>
      <input type="text" value="${escapeHtml(settings.label)}" placeholder="${escapeHtml(path)}" />
      <input type="color" value="${settings.color || "#0072B2"}" />
      <select>
        <option value="solid" ${settings.style === "solid" ? "selected" : ""}>solid</option>
        <option value="dashed" ${settings.style === "dashed" ? "selected" : ""}>dash</option>
        <option value="dashdot" ${settings.style === "dashdot" ? "selected" : ""}>dashdot</option>
        <option value="dotted" ${settings.style === "dotted" ? "selected" : ""}>dot</option>
      </select>
      <select>
        <option value="none" ${settings.marker === "none" ? "selected" : ""}>none</option>
        <option value="circle" ${settings.marker === "circle" ? "selected" : ""}>circle</option>
        <option value="square" ${settings.marker === "square" ? "selected" : ""}>square</option>
        <option value="triangle" ${settings.marker === "triangle" ? "selected" : ""}>tri</option>
        <option value="diamond" ${settings.marker === "diamond" ? "selected" : ""}>dia</option>
      </select>
      <input type="number" min="0.05" max="1" step="0.05" value="${settings.alpha || ""}" placeholder="alpha" />
      <button type="button" title="Use auto color">Auto</button>
    `;
    const labelInput = row.querySelector('input[type="text"]');
    const colorInput = row.querySelector('input[type="color"]');
    const styleInput = row.querySelectorAll("select")[0];
    const markerInput = row.querySelectorAll("select")[1];
    const alphaInput = row.querySelector('input[type="number"]');
    const autoButton = row.querySelector("button");
    labelInput.addEventListener("input", () => {
      settings.label = labelInput.value;
      if (compareMode) refreshPlotSoon();
    });
    colorInput.addEventListener("input", () => {
      settings.color = colorInput.value;
      if (compareMode) refreshPlotSoon();
    });
    styleInput.addEventListener("change", () => {
      settings.style = styleInput.value;
      if (compareMode) refreshPlotSoon();
    });
    markerInput.addEventListener("change", () => {
      settings.marker = markerInput.value;
      if (compareMode) refreshPlotSoon();
    });
    alphaInput.addEventListener("input", () => {
      settings.alpha = alphaInput.value;
      if (compareMode) refreshPlotSoon();
    });
    autoButton.addEventListener("click", () => {
      settings.color = "";
      settings.style = "solid";
      settings.marker = "none";
      settings.alpha = "1";
      colorInput.value = "#0072B2";
      styleInput.value = "solid";
      markerInput.value = "none";
      alphaInput.value = "1";
      if (compareMode) refreshPlotSoon();
    });
    legendEditor.appendChild(row);
  }
}

async function exportPanel() {
  if (!currentFileId || comparePaths.size < 1) return;

  panelButton.disabled = true;
  panelButton.textContent = "Exporting...";
  try {
    const imageFormat = formatInput.value;
    downloadBlob(await fetchPanelImage(imageFormat), `panel.${imageFormat}`);
  } finally {
    updateCompareButton();
  }
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
    lineStyle: lineStyleInput.value,
    markerStyle: markerStyleInput.value,
    lineAlpha: lineAlphaInput.value,
    colormap: colormapInput.value,
    normalization: normalizationInput.value,
    showErrors: showErrorsInput.checked,
    showLegend: showLegendInput.checked,
    uncertaintyBand: uncertaintyBandInput.checked,
    compareMode: compareModeInput.value,
    fitEnabled: fitEnabledInput.checked,
    fitModel: fitModelInput.value,
    fitXMin: fitXMinInput.value,
    fitXMax: fitXMaxInput.value,
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
      statusBox.textContent = `Failed to export all: ${await errorMessage(response)}`;
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
