
function applyPreset(name) {
  const target = activeSettingsTarget();
  Object.assign(target, PRESETS[name] || PRESETS.journal);
}

function resetSettings() {
  Object.assign(globalSettings, DEFAULT_SETTINGS);
  histSettings.clear();
  customInput.checked = false;
  customInput.disabled = !currentHist;
  loadSettingsToForm();
  showStatus("Settings reset to defaults");
  refreshPlotSoon();
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
    objects: Array.from(comparePaths).map((ref) => {
      const hist = allHistograms.find((item) => item.ref === ref);
      return { fileId: hist.fileId, path: hist.path, label: `${hist.rootFileName}: ${hist.path}` };
    }),
    columns: panelColumnsInput.value,
    sharedX: panelSharedXInput.checked,
    sharedY: panelSharedYInput.checked,
    sharedZ: panelSharedZInput.checked,
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
    objects: paths.map((ref) => {
      const hist = allHistograms.find((item) => item.ref === ref);
      return { fileId: hist.fileId, path: hist.path, label: `${hist.rootFileName}: ${hist.path}` };
    }),
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
    const hist = allHistograms.find((item) => item.ref === path);
    return row?.label || labels[index] || (hist ? `${hist.rootFileName}: ${hist.path}` : path);
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

