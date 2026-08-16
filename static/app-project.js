function setPlotBlob(blob) {
  if (compareObjectUrl) {
    URL.revokeObjectURL(compareObjectUrl);
  }
  compareObjectUrl = URL.createObjectURL(blob);
  plotImage.src = compareObjectUrl;
}

function setDownloadBlob(blob, filename) {
  if (downloadLink.href.startsWith("blob:")) {
    URL.revokeObjectURL(downloadLink.href);
  }
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.classList.remove("disabled");
}

function setDownloadUrl(url, filename) {
  if (downloadLink.href.startsWith("blob:")) {
    URL.revokeObjectURL(downloadLink.href);
  }
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
    showBinValues: showBinValuesInput.checked,
    textFontSize: textFontSizeInput.value || "auto",
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
    analysisXMin: analysisXMinInput.value,
    analysisXMax: analysisXMaxInput.value,
    showAnalysisRange: showAnalysisRangeInput.checked,
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

function applyPresetToSelected() {
  const preset = PRESETS[stylePresetInput.value] || PRESETS.journal;
  const selected = Array.from(comparePaths)
    .map((ref) => allHistograms.find((hist) => hist.ref === ref))
    .filter(Boolean);
  selected.forEach((hist) => histSettings.set(objectStableKey(hist), { ...globalSettings, ...preset }));
  showStatus(`Applied ${stylePresetInput.value} preset to ${selected.length} objects`);
  if (currentHist && selected.some((hist) => hist.ref === currentHist.ref)) loadSettingsToForm();
  refreshPlotSoon();
}

async function exportSelected() {
  const objects = Array.from(comparePaths)
    .map((ref) => allHistograms.find((hist) => hist.ref === ref))
    .filter(Boolean)
    .map((hist) => ({ fileId: hist.fileId, path: hist.path, label: `${hist.rootFileName}: ${hist.path}` }));
  if (!objects.length) return;
  exportSelectedButton.disabled = true;
  try {
    const payload = { format: formatInput.value, objects, ...stylePayload(formatInput.value) };
    const response = await fetch(`/api/files/${currentFileId}/export-selected`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) throw await errorFromResponse(response, { endpoint: `/api/files/${currentFileId}/export-selected`, payload });
    downloadBlob(await response.blob(), `selected_histograms_${formatInput.value}.zip`);
  } catch (error) {
    showError("Export selected", error);
  } finally {
    updateCompareButton();
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
    const hist = findHistogramByProjectKey(path);
    histSettings.set(hist ? objectStableKey(hist) : path, settings);
  }
  if (payload.format) {
    formatInput.value = payload.format;
  }
  customInput.checked = currentHist ? histSettings.has(objectStableKey(currentHist)) : false;
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
      files: Array.from(loadedFiles.values()).map((file) => ({
        rootFileName: file.rootFileName || "",
        rootFilePath: file.rootFilePath || "",
      })),
    },
    view: {
      mode: panelMode ? "panel" : compareMode ? "compare" : "single",
      currentPath: currentHist ? objectStableKey(currentHist) : "",
      comparePaths: Array.from(comparePaths).map((ref) => {
        const hist = allHistograms.find((item) => item.ref === ref);
        return hist ? objectStableKey(hist) : ref;
      }),
      search: searchInput.value,
      format: formatInput.value,
    },
    settings: {
      global: { ...globalSettings },
      perObject: Object.fromEntries(histSettings),
    },
    compare: {
      legendText: compareLabelsInput.value,
      curves: Object.fromEntries(Array.from(legendSettings, ([ref, settings]) => {
        const hist = allHistograms.find((item) => item.ref === ref);
        return [hist ? objectStableKey(hist) : ref, settings];
      })),
    },
    panel: {
      columns: panelColumnsInput.value,
      sharedX: panelSharedXInput.checked,
      sharedY: panelSharedYInput.checked,
      sharedZ: panelSharedZInput.checked,
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
  const expectedFiles = Array.isArray(payload.source?.files) && payload.source.files.length
    ? payload.source.files
    : [{ rootFileName: expectedRootFileName, rootFilePath: expectedRootFilePath }];

  for (const [index, sourceFile] of expectedFiles.entries()) {
    const sourcePath = sourceFile.rootFilePath || "";
    if (!sourcePath || loadedFilesHasPath(sourcePath)) continue;
    try {
      await openLocalRootPath(sourcePath, true);
    } catch (error) {
      if (!allHistograms.length && index === 0) {
        throw new Error(`Cannot open ROOT file from saved path. Upload it manually: ${sourceFile.rootFileName || sourcePath}`);
      }
      setDiagnostics("Load project", error, {
        note: "Could not auto-open one of the saved ROOT paths. Upload the missing file manually.",
        projectRootFilePath: sourcePath,
      });
    }
  }

  if (!allHistograms.length) {
    throw new Error("Upload the matching ROOT file before loading a project");
  }

  Object.assign(globalSettings, payload.settings?.global || {});
  histSettings.clear();
  for (const [path, settings] of Object.entries(payload.settings?.perObject || {})) {
    const hist = findHistogramByProjectKey(path);
    histSettings.set(hist ? objectStableKey(hist) : path, settings);
  }

  legendSettings.clear();
  for (const [path, settings] of Object.entries(payload.compare?.curves || {})) {
    const hist = findHistogramByProjectKey(path);
    if (hist) legendSettings.set(hist.ref, settings);
  }

  comparePaths = new Set((payload.view?.comparePaths || [])
    .map((path) => findHistogramByProjectKey(path)?.ref)
    .filter(Boolean));
  compareLabelsInput.value = payload.compare?.legendText || "";
  searchInput.value = payload.view?.search || "";
  formatInput.value = payload.view?.format || "png";

  panelColumnsInput.value = payload.panel?.columns || "2";
  panelSharedXInput.checked = Boolean(payload.panel?.sharedX);
  panelSharedYInput.checked = Boolean(payload.panel?.sharedY);
  panelSharedZInput.checked = Boolean(payload.panel?.sharedZ);
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

  if (expectedRootFileName && currentRootFileName && expectedRootFileName !== currentRootFileName && expectedFiles.length === 1) {
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
