const fileInput = document.querySelector("#fileInput");
const rootPathInput = document.querySelector("#rootPathInput");
const openRootPathButton = document.querySelector("#openRootPathButton");
const dropZone = document.querySelector("#dropZone");
const statusBox = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");
const compareButton = document.querySelector("#compareButton");
const previewPanelButton = document.querySelector("#previewPanelButton");
const panelButton = document.querySelector("#panelButton");
const histList = document.querySelector("#histList");
const plotImage = document.querySelector("#plotImage");
const selectionOverlay = document.querySelector("#selectionOverlay");
const selectionBox = document.querySelector("#selectionBox");
const summaryLine = document.querySelector("#summaryLine");
const selectedName = document.querySelector("#selectedName");
const downloadLink = document.querySelector("#downloadLink");
const formatInput = document.querySelector("#formatInput");
const exportAllButton = document.querySelector("#exportAllButton");
const exportLlmButton = document.querySelector("#exportLlmButton");
const saveStyleButton = document.querySelector("#saveStyleButton");
const styleFileInput = document.querySelector("#styleFileInput");
const saveProjectButton = document.querySelector("#saveProjectButton");
const projectFileInput = document.querySelector("#projectFileInput");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanes = document.querySelectorAll(".tab-pane");
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
const copyDiagnosticsButton = document.querySelector("#copyDiagnosticsButton");
const diagnosticsOutput = document.querySelector("#diagnosticsOutput");
const analysisXMinInput = document.querySelector("#analysisXMinInput");
const analysisXMaxInput = document.querySelector("#analysisXMaxInput");
const analysisResults = document.querySelector("#analysisResults");
const analysisWarnings = document.querySelector("#analysisWarnings");
const scaleControls = document.querySelectorAll(".segmented[data-scale]");

const APP_CONFIG = window.HIST_STYLE_WEB || {};
const APP_VERSION = APP_CONFIG.appVersion || "0.2.0";
const PROJECT_SCHEMA = APP_CONFIG.projectSchema || "hist-style-web.project";
const PROJECT_SCHEMA_VERSION = Number(APP_CONFIG.projectSchemaVersion || 2);
const STYLE_SCHEMA = "hist-style-web.style";
const STYLE_SCHEMA_VERSION = 1;

let currentFileId = null;
let currentHist = null;
let currentRootFileName = "";
let currentRootFilePath = "";
let refreshTimer = null;
let analysisTimer = null;
let metadataTimer = null;
let renderRequestId = 0;
let compareRequestId = 0;
let panelRequestId = 0;
let summaryRequestId = 0;
let analysisRequestId = 0;
let metadataRequestId = 0;
let renderInFlight = false;
let postRenderRefreshQueued = false;
let allHistograms = [];
let comparePaths = new Set();
let compareMode = false;
let panelMode = false;
let compareObjectUrl = null;
let activeTab = "render";
let currentPlotMetadata = null;
let selectionDrag = null;
let lastDiagnostics = {
  status: "No errors yet.",
};
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
openRootPathButton.addEventListener("click", () => openLocalRootPath(rootPathInput.value));
tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});
selectionOverlay.addEventListener("pointerdown", startSelection);
selectionOverlay.addEventListener("pointermove", updateSelection);
selectionOverlay.addEventListener("pointerup", finishSelection);
selectionOverlay.addEventListener("pointercancel", cancelSelection);

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

[analysisXMinInput, analysisXMaxInput].forEach((input) => {
  input.addEventListener("input", refreshAnalysisSoon);
  input.addEventListener("change", refreshAnalysisSoon);
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
    refreshPlot();
  }
});
exportAllButton.addEventListener("click", exportAll);
exportLlmButton.addEventListener("click", exportForLlm);
compareButton.addEventListener("click", compareSelected);
previewPanelButton.addEventListener("click", previewPanel);
panelButton.addEventListener("click", exportPanel);
saveStyleButton.addEventListener("click", saveStyle);
styleFileInput.addEventListener("change", loadStyle);
saveProjectButton.addEventListener("click", saveProject);
projectFileInput.addEventListener("change", loadProject);
copyDiagnosticsButton.addEventListener("click", copyDiagnostics);
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

function activateTab(name) {
  activeTab = name;
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  tabPanes.forEach((pane) => {
    pane.classList.toggle("active", pane.id === `${name}Tab`);
  });
  if (name === "analysis") {
    refreshAnalysisSoon();
    refreshPlotMetadataSoon();
  } else {
    updateSelectionOverlay();
  }
}

async function uploadFile(file) {
  showStatus("Uploading...");
  histList.innerHTML = "";
  plotImage.removeAttribute("src");
  summaryLine.textContent = "";
  currentPlotMetadata = null;
  updateSelectionOverlay();
  analysisResults.textContent = "Select a 1D object";
  analysisWarnings.innerHTML = "<li>No object selected</li>";
  selectedName.textContent = "Select a histogram";
  downloadLink.classList.add("disabled");
  exportLlmButton.disabled = true;

  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    showError("Upload ROOT file", await errorFromResponse(response), {
      endpoint: "/api/upload",
      filename: file.name,
      size: file.size,
    });
    return;
  }

  const data = await response.json();
  const typedPath = rootPathInput.value.trim();
  const typedName = typedPath.split(/[\\/]/).pop();
  setLoadedRootFile(data, file.name, typedName === file.name ? typedPath : "");
}

async function openLocalRootPath(path, silent = false) {
  const rootPath = path.trim();
  if (!rootPath) {
    throw new Error("ROOT file path is empty");
  }

  if (!silent) showStatus("Opening local ROOT file...");
  const response = await fetch("/api/open-local-root", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: rootPath }),
  });
  if (!response.ok) {
    const error = await errorFromResponse(response, {
      endpoint: "/api/open-local-root",
      path: rootPath,
    });
    if (!silent) showError("Open local ROOT file", error);
    throw error;
  }

  const data = await response.json();
  setLoadedRootFile(data, data.rootFileName || rootPath.split(/[\\/]/).pop(), data.rootFilePath || rootPath);
}

function setLoadedRootFile(data, rootFileName, rootFilePath = "") {
  currentFileId = data.fileId;
  currentRootFileName = rootFileName || "";
  currentRootFilePath = rootFilePath || "";
  rootPathInput.value = currentRootFilePath;
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
  exportLlmButton.disabled = false;
  loadSettingsToForm();
  objectInfo.textContent = "Select an object";
  currentPlotMetadata = null;
  updateSelectionOverlay();
  analysisResults.textContent = "Select a 1D object";
  analysisWarnings.innerHTML = "<li>No object selected</li>";
  showStatus(`${data.histograms.length} histograms found`);
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

function selectHistogram(hist, button, render = true) {
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
  if (render) {
    refreshPlot();
  } else {
    refreshPostRenderData();
  }
}

function selectHistogramByPath(path, render = true) {
  const hist = allHistograms.find((item) => item.path === path);
  if (!hist) {
    showError("Load project", new Error(`Object not found in current ROOT file: ${path}`));
    return;
  }
  const buttons = Array.from(document.querySelectorAll(".hist-item"));
  const button = buttons.find((item) => item.querySelector("span")?.textContent === path);
  if (button) {
    selectHistogram(hist, button, render);
  } else {
    currentHist = hist;
    customInput.disabled = false;
    customInput.checked = histSettings.has(hist.path);
    loadSettingsToForm();
    selectedName.textContent = hist.path;
    downloadLink.classList.remove("disabled");
    refreshObjectInfo(hist.path);
    if (render) {
      refreshPlot();
    } else {
      refreshPostRenderData();
    }
  }
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
  clearTimeout(analysisTimer);
  clearTimeout(metadataTimer);
  postRenderRefreshQueued = true;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refreshPlot();
  }, 250);
}

function refreshAnalysisSoon(force = false) {
  if (!force && hasPendingRender()) {
    clearTimeout(analysisTimer);
    postRenderRefreshQueued = true;
    return;
  }
  clearTimeout(analysisTimer);
  analysisTimer = setTimeout(refreshAnalysis, 250);
}

function refreshPlotMetadataSoon(force = false) {
  if (!force && hasPendingRender()) {
    clearTimeout(metadataTimer);
    postRenderRefreshQueued = true;
    return;
  }
  clearTimeout(metadataTimer);
  metadataTimer = setTimeout(refreshPlotMetadata, 250);
}

function hasPendingRender() {
  return Boolean(refreshTimer) || renderInFlight;
}

function refreshPostRenderData() {
  postRenderRefreshQueued = false;
  refreshSummary();
  refreshPlotMetadataSoon(true);
  if (activeTab === "analysis") {
    refreshAnalysisSoon(true);
  }
}

async function refreshPlot() {
  clearTimeout(refreshTimer);
  refreshTimer = null;

  if (compareMode) {
    postRenderRefreshQueued = false;
    compareSelected();
    return;
  }
  if (panelMode) {
    postRenderRefreshQueued = false;
    previewPanel();
    return;
  }

  if (!currentFileId || !currentHist) return;

  const imageFormat = formatInput.value;
  const requestId = ++renderRequestId;
  const renderPath = currentHist.path;
  renderInFlight = true;
  let renderCompleted = false;
  try {
    const blob = await fetchPlotImage(currentHist, "png");
    if (!isCurrentRenderRequest(requestId, renderPath)) return;
    setPlotBlob(blob);
    if (imageFormat === "png") {
      setDownloadBlob(blob, `${safeName(renderPath)}.png`);
    } else {
      const downloadBlob = await fetchPlotImage(currentHist, imageFormat);
      if (!isCurrentRenderRequest(requestId, renderPath)) return;
      setDownloadBlob(downloadBlob, `${safeName(renderPath)}.${imageFormat}`);
    }
    renderInFlight = false;
    renderCompleted = true;
    refreshPostRenderData();
  } catch (error) {
    if (!isCurrentRenderRequest(requestId, renderPath)) return;
    showError(`Render ${currentHist.path}`, error);
  } finally {
    if (requestId === renderRequestId) {
      renderInFlight = false;
      if (renderCompleted && postRenderRefreshQueued && !refreshTimer) {
        refreshPostRenderData();
      }
    }
  }
}

function isCurrentRenderRequest(requestId, path) {
  return requestId === renderRequestId && currentHist?.path === path && !compareMode && !panelMode;
}

function updateDownloadLink() {
  if (!currentFileId || !currentHist) return;
  if (compareMode || panelMode) return;
  const imageFormat = formatInput.value;
  downloadLink.href = plotUrl(currentHist, imageFormat);
  downloadLink.download = `${safeName(currentHist.path)}.${imageFormat}`;
}

async function fetchPlotImage(hist, imageFormat) {
  const url = plotUrl(hist, imageFormat);
  const response = await fetch(url);
  if (!response.ok) {
    throw await errorFromResponse(response, {
      endpoint: url.split("?")[0],
      path: hist.path,
      params: Object.fromEntries(new URLSearchParams(url.split("?")[1] || "")),
    });
  }
  return await response.blob();
}

async function refreshSummary() {
  if (!showSummaryInput.checked) {
    summaryLine.textContent = "";
    summaryLine.hidden = true;
    return;
  }
  summaryLine.hidden = false;
  if (compareMode) {
    summaryRequestId += 1;
    summaryLine.textContent = `Compared: ${comparePaths.size} histograms`;
    return;
  }
  if (panelMode) {
    summaryRequestId += 1;
    summaryLine.textContent = `Panel: ${comparePaths.size} objects`;
    return;
  }
  if (!currentFileId || !currentHist) return;

  const requestId = ++summaryRequestId;
  const summaryPath = currentHist.path;
  const params = new URLSearchParams();
  params.set("path", summaryPath);

  const response = await fetch(`/api/files/${currentFileId}/summary?${params.toString()}`);
  if (requestId !== summaryRequestId || currentHist?.path !== summaryPath || compareMode || panelMode) return;
  if (!response.ok) {
    const error = await errorFromResponse(response);
    summaryLine.textContent = `Failed to summarize ${summaryPath}: ${error.message}`;
    setDiagnostics("Summarize object", error, {
      endpoint: `/api/files/${currentFileId}/summary`,
      path: summaryPath,
    });
    return;
  }

  const summary = await response.json();
  if (requestId !== summaryRequestId || currentHist?.path !== summaryPath || compareMode || panelMode) return;
  summaryLine.textContent = formatSummary(summary);
}

async function refreshObjectInfo(path) {
  objectInfo.textContent = "Loading...";
  const params = new URLSearchParams();
  params.set("path", path);
  const response = await fetch(`/api/files/${currentFileId}/info?${params.toString()}`);
  if (!response.ok) {
    const error = await errorFromResponse(response);
    objectInfo.textContent = `Failed to load info for ${path}: ${error.message}`;
    setDiagnostics("Load object info", error, {
      endpoint: `/api/files/${currentFileId}/info`,
      path,
    });
    return;
  }
  objectInfo.innerHTML = formatObjectInfo(await response.json());
}

async function refreshAnalysis() {
  if (!currentFileId || !currentHist || compareMode || panelMode) {
    return;
  }

  const requestId = ++analysisRequestId;
  const analysisPath = currentHist.path;
  const payload = {
    path: analysisPath,
    settings: formSettings(),
    xMin: analysisXMinInput.value,
    xMax: analysisXMaxInput.value,
  };

  try {
    const response = await fetch(`/api/files/${currentFileId}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await errorFromResponse(response, {
        endpoint: `/api/files/${currentFileId}/analysis`,
        payload,
      });
    }
    const analysis = await response.json();
    if (requestId !== analysisRequestId || currentHist?.path !== analysisPath || compareMode || panelMode) return;
    renderAnalysis(analysis);
  } catch (error) {
    if (requestId !== analysisRequestId || currentHist?.path !== analysisPath || compareMode || panelMode) return;
    showError("Analyze object", error);
  }
}

async function refreshPlotMetadata() {
  if (!currentFileId || !currentHist || compareMode || panelMode) {
    metadataRequestId += 1;
    currentPlotMetadata = null;
    updateSelectionOverlay();
    return;
  }

  const requestId = ++metadataRequestId;
  const metadataPath = currentHist.path;
  const payload = {
    path: metadataPath,
    settings: formSettings(),
  };

  try {
    const response = await fetch(`/api/files/${currentFileId}/plot-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await errorFromResponse(response, {
        endpoint: `/api/files/${currentFileId}/plot-metadata`,
        payload,
      });
    }
    const metadata = await response.json();
    if (requestId !== metadataRequestId || currentHist?.path !== metadataPath || compareMode || panelMode) return;
    currentPlotMetadata = metadata;
    updateSelectionOverlay();
  } catch (error) {
    if (requestId !== metadataRequestId || currentHist?.path !== metadataPath || compareMode || panelMode) return;
    currentPlotMetadata = null;
    updateSelectionOverlay();
    setDiagnostics("Load plot metadata", normalizeError(error));
  }
}

function renderAnalysis(analysis) {
  if (analysis.message) {
    analysisResults.textContent = analysis.message;
  } else {
    analysisResults.innerHTML = [
      analysisSection("Interpretation", interpretationRows(analysis.metadata)),
      analysisSection("Range", rangeRows(analysis.rangeStats)),
      analysisSection("Fit", fitRows(analysis.fit)),
    ].join("");
  }

  const warnings = analysis.warnings || [];
  analysisWarnings.innerHTML = warnings.length
    ? warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No warnings</li>";
}

function analysisSection(title, rows) {
  return `
    <div class="analysis-card">
      <strong>${title}</strong>
      <table>${rows.map(([name, value]) => `<tr><th>${name}</th><td>${value}</td></tr>`).join("")}</table>
    </div>
  `;
}

function interpretationRows(metadata) {
  if (!metadata) return [["Status", "No interpretation metadata"]];
  const rows = [
    ["Object", escapeHtml(metadata.objectKind || "unknown")],
    ["Normalization", escapeHtml(metadata.normalization || "raw")],
    ["Integral", escapeHtml(metadata.integralDefinition || "sum of displayed bin values")],
    ["Fit input", escapeHtml(metadata.fitInput || "displayed bin values")],
  ];
  if (metadata.profileSemantics) {
    rows.push(["Profile", escapeHtml(metadata.profileSemantics)]);
  }
  const logScales = metadata.logScales || {};
  const activeLogs = ["x", "y", "z"].filter((axis) => logScales[axis]).map((axis) => axis.toUpperCase());
  rows.push(["Log scales", activeLogs.length ? activeLogs.join(", ") : "none"]);
  return rows;
}

function rangeRows(stats) {
  if (!stats) return [["Status", "No range statistics"]];
  return [
    ["Bins", stats.bins],
    ["Integral", formatNumber(stats.integral)],
    ["Fraction", `${formatNumber(100 * stats.fraction)}%`],
    ["Mean", formatNumber(stats.mean)],
    ["RMS", formatNumber(stats.rms)],
  ];
}

function fitRows(fit) {
  if (!fit || !fit.enabled) return [["Status", "Fit disabled"]];
  if (!fit.ok) return [["Status", escapeHtml(fit.message || "Fit failed")]];
  const rows = [
    ["Model", escapeHtml(fit.model)],
    ["Points", fit.points],
    ["chi2 / ndf", fit.ndf ? `${formatNumber(fit.chi2)} / ${fit.ndf} = ${formatNumber(fit.chi2Ndf)}` : "n/a"],
    ["Residual RMS", formatNumber(fit.residualRms)],
    ["Pull mean / RMS", `${formatNumber(fit.pullMean)} / ${formatNumber(fit.pullRms)}`],
  ];
  for (const parameter of fit.parameters || []) {
    rows.push([escapeHtml(parameter.name), formatNumber(parameter.value)]);
  }
  return rows;
}

function updateSelectionOverlay() {
  const canSelect = activeTab === "analysis" && currentPlotMetadata && ["TH1", "TProfile"].includes(currentPlotMetadata.kind);
  selectionOverlay.hidden = !canSelect;
  if (!canSelect) {
    selectionBox.style.display = "none";
  }
}

function startSelection(event) {
  if (selectionOverlay.hidden || !currentPlotMetadata) return;
  event.preventDefault();
  selectionOverlay.setPointerCapture(event.pointerId);
  const x = clampedOverlayX(event);
  selectionDrag = { startX: x, currentX: x, pointerId: event.pointerId };
  drawSelectionBox(selectionDrag.startX, selectionDrag.currentX);
}

function updateSelection(event) {
  if (!selectionDrag || event.pointerId !== selectionDrag.pointerId) return;
  selectionDrag.currentX = clampedOverlayX(event);
  drawSelectionBox(selectionDrag.startX, selectionDrag.currentX);
}

function finishSelection(event) {
  if (!selectionDrag || event.pointerId !== selectionDrag.pointerId) return;
  selectionDrag.currentX = clampedOverlayX(event);
  const startX = selectionDrag.startX;
  const endX = selectionDrag.currentX;
  selectionDrag = null;
  selectionOverlay.releasePointerCapture(event.pointerId);

  if (Math.abs(endX - startX) < 4) {
    selectionBox.style.display = "none";
    return;
  }

  const xA = pixelToDataX(Math.min(startX, endX));
  const xB = pixelToDataX(Math.max(startX, endX));
  if (xA === null || xB === null) {
    selectionBox.style.display = "none";
    return;
  }
  analysisXMinInput.value = compactNumber(xA);
  analysisXMaxInput.value = compactNumber(xB);
  refreshAnalysisSoon();
}

function cancelSelection(event) {
  if (selectionDrag && event.pointerId === selectionDrag.pointerId) {
    selectionDrag = null;
    selectionBox.style.display = "none";
  }
}

function drawSelectionBox(startX, endX) {
  const left = Math.min(startX, endX);
  const width = Math.abs(endX - startX);
  selectionBox.style.display = "block";
  selectionBox.style.left = `${left}px`;
  selectionBox.style.width = `${width}px`;
}

function clampedOverlayX(event) {
  const rect = selectionOverlay.getBoundingClientRect();
  return Math.max(0, Math.min(rect.width, event.clientX - rect.left));
}

function pixelToDataX(pixelX) {
  const imageRect = renderedImageRect();
  if (!imageRect || !currentPlotMetadata?.axesBox) return null;
  const axes = currentPlotMetadata.axesBox;
  const axesLeft = imageRect.left + axes.left * imageRect.width;
  const axesWidth = axes.width * imageRect.width;
  if (axesWidth <= 0) return null;
  const relative = Math.max(0, Math.min(1, (pixelX - axesLeft) / axesWidth));
  const xMin = Number(currentPlotMetadata.xMin);
  const xMax = Number(currentPlotMetadata.xMax);
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) return null;
  return xMin + relative * (xMax - xMin);
}

function renderedImageRect() {
  if (!plotImage.naturalWidth || !plotImage.naturalHeight) return null;
  const imageBox = plotImage.getBoundingClientRect();
  const overlayBox = selectionOverlay.getBoundingClientRect();
  const naturalRatio = plotImage.naturalWidth / plotImage.naturalHeight;
  const boxRatio = imageBox.width / imageBox.height;
  let width = imageBox.width;
  let height = imageBox.height;
  let left = imageBox.left - overlayBox.left;
  let top = imageBox.top - overlayBox.top;
  if (boxRatio > naturalRatio) {
    width = imageBox.height * naturalRatio;
    left += (imageBox.width - width) / 2;
  } else {
    height = imageBox.width / naturalRatio;
    top += (imageBox.height - height) / 2;
  }
  return { left, top, width, height };
}

function compactNumber(value) {
  return Number(value).toPrecision(8).replace(/\.?0+($|e)/, "$1");
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
  if (summary.kind === "TH2" || summary.kind === "TProfile2D") {
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
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "n/a";
  }
  return Number(value).toLocaleString(undefined, {
    maximumSignificantDigits: 5,
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function plotUrl(hist, imageFormat = "png") {
  const settings = effectiveSettings(hist);
  const params = new URLSearchParams();
  params.set("path", hist.path);
  params.set("dpi", integerSetting(settings.dpi, "200"));
  params.set("aspect_ratio", settings.aspectRatio);
  params.set("x_scale", settings.xScale);
  params.set("y_scale", settings.yScale);
  params.set("z_scale", settings.zScale);
  params.set("line_width", numberSetting(settings.lineWidth, "2"));
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
  target.lineWidth = numberSetting(lineWidthInput.value, target.lineWidth || globalSettings.lineWidth || "2");
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
  lineWidthInput.value = numberSetting(settings.lineWidth, "2");
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
  const requestId = ++compareRequestId;
  const requestKey = paths.join("\n");
  try {
    const blob = await fetchCompareImage("png", paths);
    if (!isCurrentCompareRequest(requestId, requestKey)) return;
    setPlotBlob(blob);
    if (imageFormat === "png") {
      setDownloadBlob(blob, "compare.png");
    } else {
      const downloadBlob = await fetchCompareImage(imageFormat, paths);
      if (!isCurrentCompareRequest(requestId, requestKey)) return;
      setDownloadBlob(downloadBlob, `compare.${imageFormat}`);
    }
    refreshSummary();
  } catch (error) {
    if (!isCurrentCompareRequest(requestId, requestKey)) return;
    showError("Compare selected objects", error);
  }
}

function isCurrentCompareRequest(requestId, requestKey) {
  return requestId === compareRequestId && compareMode && !panelMode && selectedComparePaths().join("\n") === requestKey;
}

async function previewPanel() {
  if (!currentFileId || comparePaths.size < 1) return;

  saveSettingsFromForm();
  compareMode = false;
  panelMode = true;
  selectedName.textContent = "Panel preview";
  const imageFormat = formatInput.value;
  const requestId = ++panelRequestId;
  const requestKey = Array.from(comparePaths).join("\n");
  try {
    const blob = await fetchPanelImage("png");
    if (!isCurrentPanelRequest(requestId, requestKey)) return;
    setPlotBlob(blob);
    if (imageFormat === "png") {
      setDownloadBlob(blob, "panel.png");
    } else {
      const downloadBlob = await fetchPanelImage(imageFormat);
      if (!isCurrentPanelRequest(requestId, requestKey)) return;
      setDownloadBlob(downloadBlob, `panel.${imageFormat}`);
    }
    refreshSummary();
  } catch (error) {
    if (!isCurrentPanelRequest(requestId, requestKey)) return;
    showError("Render panel", error);
  }
}

function isCurrentPanelRequest(requestId, requestKey) {
  return requestId === panelRequestId && panelMode && !compareMode && Array.from(comparePaths).join("\n") === requestKey;
}

async function fetchPanelImage(imageFormat) {
  const payload = {
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
  };
  const response = await fetch(`/api/files/${currentFileId}/panel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await errorFromResponse(response, {
      endpoint: `/api/files/${currentFileId}/panel`,
      payload,
    });
  }
  return await response.blob();
}

async function fetchCompareImage(imageFormat, paths) {
  const payload = {
    format: imageFormat,
    paths,
    labels: compareLabels(paths),
    colors: compareColors(paths),
    styles: compareStyles(paths),
    markers: compareMarkers(paths),
    alphas: compareAlphas(paths),
    settings: formSettings(),
  };
  const response = await fetch(`/api/files/${currentFileId}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await errorFromResponse(response, {
      endpoint: `/api/files/${currentFileId}/compare`,
      payload,
    });
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
  } catch (error) {
    showError("Export panel", error);
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

function showStatus(message) {
  statusBox.textContent = message;
}

function showError(context, error, details = {}) {
  const normalized = normalizeError(error);
  statusBox.textContent = `${context}: ${normalized.message}`;
  setDiagnostics(context, normalized, details);
}

function setDiagnostics(context, error, details = {}) {
  lastDiagnostics = {
    time: new Date().toISOString(),
    context,
    message: error.message || String(error),
    status: error.status || null,
    ...error.details,
    ...details,
  };
  diagnosticsOutput.textContent = JSON.stringify(lastDiagnostics, null, 2);
}

function normalizeError(error) {
  if (error && typeof error === "object") {
    return {
      message: error.message || String(error),
      status: error.status || null,
      details: error.details || {},
    };
  }
  return { message: String(error), status: null, details: {} };
}

async function copyDiagnostics() {
  const text = JSON.stringify(lastDiagnostics, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showStatus("Diagnostics copied");
  } catch {
    diagnosticsOutput.textContent = text;
  }
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
    lineWidth: numberSetting(lineWidthInput.value, "2"),
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
      showError("Export all", await errorFromResponse(response, {
        endpoint: `/api/files/${currentFileId}/export`,
        payload: stylePayload(formatInput.value),
      }));
      return;
    }
    downloadBlob(await response.blob(), `histograms_${formatInput.value}.zip`);
  } finally {
    exportAllButton.disabled = false;
    exportAllButton.textContent = "Export all";
  }
}

async function exportForLlm() {
  if (!currentFileId) return;

  const paths = llmExportPaths();
  if (!paths.length) {
    showStatus("Select an object or check objects in the list");
    return;
  }

  exportLlmButton.disabled = true;
  exportLlmButton.textContent = "Exporting...";
  try {
    const response = await fetch(`/api/files/${currentFileId}/llm-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    if (!response.ok) {
      showError("Export for LLM", await errorFromResponse(response, {
        endpoint: `/api/files/${currentFileId}/llm-export`,
        payload: { paths },
      }));
      return;
    }
    const payload = await response.json();
    const filename = paths.length === 1 ? `${safeName(paths[0])}_llm.json` : "histograms_llm.json";
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, filename);
  } finally {
    exportLlmButton.disabled = false;
    exportLlmButton.textContent = "Export for LLM";
  }
}

function llmExportPaths() {
  const checkedPaths = Array.from(comparePaths);
  if (checkedPaths.length) return checkedPaths;
  return currentHist ? [currentHist.path] : [];
}

function saveStyle() {
  const blob = new Blob([JSON.stringify(stylePayload(formatInput.value), null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "histogram_style.json");
}

function saveProject() {
  const blob = new Blob([JSON.stringify(projectPayload(), null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "histogram_project.json");
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

async function loadProject() {
  const file = projectFileInput.files[0];
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    await applyProjectPayload(payload);
    showStatus("Project loaded");
  } catch (error) {
    showError("Load project", error, { filename: file.name });
  } finally {
    projectFileInput.value = "";
  }
}

function stylePayload(imageFormat) {
  saveSettingsFromForm();
  return {
    schema: STYLE_SCHEMA,
    schemaVersion: STYLE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    app: appMetadata(),
    format: imageFormat,
    globalSettings: { ...globalSettings },
    histSettings: Object.fromEntries(histSettings),
  };
}

function projectPayload() {
  saveSettingsFromForm();
  return {
    schema: PROJECT_SCHEMA,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    app: appMetadata(),
    formats: {
      project: {
        schema: PROJECT_SCHEMA,
        schemaVersion: PROJECT_SCHEMA_VERSION,
      },
      style: {
        schema: STYLE_SCHEMA,
        schemaVersion: STYLE_SCHEMA_VERSION,
      },
    },
    source: {
      rootFileName: currentRootFileName || "",
      rootFilePath: rootPathInput.value.trim() || currentRootFilePath || "",
      objectCount: allHistograms.length,
    },
    view: {
      mode: panelMode ? "panel" : compareMode ? "compare" : "single",
      currentPath: currentHist?.path || "",
      comparePaths: Array.from(comparePaths),
      search: searchInput.value,
      format: formatInput.value,
    },
    settings: {
      global: { ...globalSettings },
      perObject: Object.fromEntries(histSettings),
    },
    compare: {
      legendText: compareLabelsInput.value,
      curves: Object.fromEntries(legendSettings),
    },
    panel: {
      columns: panelColumnsInput.value,
      sharedX: panelSharedXInput.checked,
      sharedY: panelSharedYInput.checked,
      equalRanges: panelEqualRangesInput.checked,
      panelTitles: panelTitlesInput.checked,
      spacing: panelSpacingInput.value,
      globalTitle: panelGlobalTitleInput.value,
    },
    analysis: {
      xMin: analysisXMinInput.value,
      xMax: analysisXMaxInput.value,
    },
  };
}

async function applyProjectPayload(payload) {
  payload = migrateProjectPayload(payload);
  validateProjectPayload(payload);
  const expectedRootFileName = payload.source?.rootFileName || "";
  const expectedRootFilePath = payload.source?.rootFilePath || "";

  if (expectedRootFilePath && currentRootFilePath !== expectedRootFilePath) {
    try {
      await openLocalRootPath(expectedRootFilePath, true);
    } catch (error) {
      if (!allHistograms.length) {
        throw new Error(`Cannot open ROOT file from saved path. Upload it manually: ${expectedRootFileName || expectedRootFilePath}`);
      }
      setDiagnostics("Load project", error, {
        note: "Could not auto-open saved ROOT path. Keeping the currently loaded ROOT file.",
        projectRootFilePath: expectedRootFilePath,
      });
    }
  }

  if (!allHistograms.length) {
    throw new Error("Upload the matching ROOT file before loading a project");
  }

  Object.assign(globalSettings, payload.settings?.global || {});
  histSettings.clear();
  for (const [path, settings] of Object.entries(payload.settings?.perObject || {})) {
    histSettings.set(path, settings);
  }

  legendSettings.clear();
  for (const [path, settings] of Object.entries(payload.compare?.curves || {})) {
    legendSettings.set(path, settings);
  }

  comparePaths = new Set(payload.view?.comparePaths || []);
  compareLabelsInput.value = payload.compare?.legendText || "";
  searchInput.value = payload.view?.search || "";
  formatInput.value = payload.view?.format || "png";

  panelColumnsInput.value = payload.panel?.columns || "2";
  panelSharedXInput.checked = Boolean(payload.panel?.sharedX);
  panelSharedYInput.checked = Boolean(payload.panel?.sharedY);
  panelEqualRangesInput.checked = Boolean(payload.panel?.equalRanges);
  panelTitlesInput.checked = payload.panel?.panelTitles !== false;
  panelSpacingInput.value = payload.panel?.spacing || "0.25";
  panelGlobalTitleInput.value = payload.panel?.globalTitle || "";
  analysisXMinInput.value = payload.analysis?.xMin || "";
  analysisXMaxInput.value = payload.analysis?.xMax || "";

  renderHistogramList(filteredHistograms());
  const targetPath = payload.view?.currentPath;
  if (targetPath) {
    selectHistogramByPath(targetPath, false);
  } else {
    currentHist = null;
    customInput.checked = false;
    customInput.disabled = true;
    loadSettingsToForm();
  }
  renderLegendEditor();
  updateCompareButton();

  const mode = payload.view?.mode || "single";
  if (mode === "compare" && selectedComparePaths().length >= 2) {
    compareSelected();
  } else if (mode === "panel" && comparePaths.size >= 1) {
    previewPanel();
  } else if (currentHist) {
    refreshPlot();
  }

  if (expectedRootFileName && currentRootFileName && expectedRootFileName !== currentRootFileName) {
    setDiagnostics("Load project", new Error("Project was saved for a different ROOT file."), {
      projectRootFileName: expectedRootFileName,
      currentRootFileName,
      projectRootFilePath: expectedRootFilePath,
      currentRootFilePath,
    });
  }
}

function appMetadata() {
  return {
    name: "Histogram Style Web",
    version: APP_VERSION,
  };
}

function migrateProjectPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Project file must be a JSON object");
  }
  if (payload.schema === PROJECT_SCHEMA && Number(payload.schemaVersion) === PROJECT_SCHEMA_VERSION) {
    return payload;
  }
  if (payload.schema === "hist-style-web.project.v1") {
    return {
      schema: PROJECT_SCHEMA,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      migratedFrom: {
        schema: payload.schema,
        schemaVersion: 1,
      },
      createdAt: payload.createdAt || "",
      migratedAt: new Date().toISOString(),
      app: payload.app || appMetadata(),
      formats: {
        project: {
          schema: PROJECT_SCHEMA,
          schemaVersion: PROJECT_SCHEMA_VERSION,
        },
        style: {
          schema: STYLE_SCHEMA,
          schemaVersion: STYLE_SCHEMA_VERSION,
        },
      },
      source: payload.source || {},
      view: payload.view || {},
      settings: payload.settings || {},
      compare: payload.compare || {},
      panel: payload.panel || {},
      analysis: payload.analysis || {},
    };
  }
  throw new Error(`Unsupported project file schema: ${payload.schema || "missing"}`);
}

function validateProjectPayload(payload) {
  if (payload.schema !== PROJECT_SCHEMA) {
    throw new Error(`Unsupported project file schema: ${payload.schema || "missing"}`);
  }
  if (Number(payload.schemaVersion) !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`Unsupported project schema version: ${payload.schemaVersion || "missing"}`);
  }
  if (!payload.settings || typeof payload.settings !== "object") {
    throw new Error("Project file is missing settings");
  }
  if (payload.settings.global && typeof payload.settings.global !== "object") {
    throw new Error("Project global settings must be an object");
  }
  if (payload.settings.perObject && typeof payload.settings.perObject !== "object") {
    throw new Error("Project per-object settings must be an object");
  }
  if (payload.view?.comparePaths && !Array.isArray(payload.view.comparePaths)) {
    throw new Error("Project compare paths must be an array");
  }
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

async function errorFromResponse(response, details = {}) {
  try {
    const data = await response.json();
    return {
      message: readableDetail(data.detail) || response.statusText,
      status: response.status,
      details,
    };
  } catch {
    return {
      message: await response.text(),
      status: response.status,
      details,
    };
  }
}

function readableDetail(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  }
  return JSON.stringify(detail);
}
