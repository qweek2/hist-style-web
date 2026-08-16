fileInput.addEventListener("change", () => {
  Array.from(fileInput.files).forEach((file) => uploadFile(file, true));
  fileInput.value = "";
});
openRootPathButton.addEventListener("click", () => openLocalRootPath(rootPathInput.value));
tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});
selectionOverlay.addEventListener("pointerdown", startSelection);
selectionOverlay.addEventListener("pointermove", updateSelection);
selectionOverlay.addEventListener("pointerup", finishSelection);
selectionOverlay.addEventListener("pointercancel", cancelSelection);

[dpiInput, aspectRatioInput, lineWidthInput, lineColorInput, lineStyleInput, markerStyleInput, lineAlphaInput, colormapInput, showBinValuesInput, textFontSizeInput, normalizationInput, showErrorsInput, showLegendInput, uncertaintyBandInput, compareModeInput, fitEnabledInput, fitModelInput, fitXMinInput, fitXMaxInput, titleInput, xLabelInput, yLabelInput, compareLabelsInput, titleFontSizeInput, labelFontSizeInput, tickFontSizeInput, xMinInput, xMaxInput, yMinInput, yMaxInput, zMinInput, zMaxInput, showSummaryInput, includeSummaryInput, showAnalysisRangeInput, panelSharedXInput, panelSharedYInput, panelSharedZInput, panelEqualRangesInput, panelTitlesInput, panelSpacingInput, panelGlobalTitleInput].forEach((input) => {
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
  input.addEventListener("input", () => { refreshAnalysisSoon(); refreshPlotSoon(); });
  input.addEventListener("change", () => { refreshAnalysisSoon(); refreshPlotSoon(); });
});
peakSensitivityInput.addEventListener("input", () => {
  peakSensitivityValue.value = Number(peakSensitivityInput.value).toFixed(2);
  refreshAnalysisSoon(true);
});

stylePresetInput.addEventListener("change", () => {
  applyPreset(stylePresetInput.value);
  loadSettingsToForm();
  refreshPlotSoon();
});

resetSettingsButton.addEventListener("click", resetSettings);

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
createDerivedButton.addEventListener("click", createDerivedHistogram);
derivedOperationInput.addEventListener("change", refreshDerivedInputs);
applySelectedStyleButton.addEventListener("click", applyPresetToSelected);
exportSelectedButton.addEventListener("click", exportSelected);
saveStyleButton.addEventListener("click", saveStyle);
styleFileInput.addEventListener("change", loadStyle);
saveProjectButton.addEventListener("click", saveProject);
projectFileInput.addEventListener("change", loadProject);
copyDiagnosticsButton.addEventListener("click", copyDiagnostics);
searchInput.addEventListener("input", () => renderHistogramList(filteredHistograms()));
[fileFilterInput, kindFilterInput, folderFilterInput].forEach((input) => {
  input.addEventListener("change", () => renderHistogramList(filteredHistograms()));
});

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
  const settingsKey = objectStableKey(currentHist);
  if (customInput.checked && !histSettings.has(settingsKey)) {
    histSettings.set(settingsKey, { ...globalSettings });
  }
  if (!customInput.checked) {
    histSettings.delete(settingsKey);
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
  Array.from(event.dataTransfer.files).forEach((file) => uploadFile(file, true));
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
