
async function uploadFile(file, append = false) {
  showStatus(`Uploading ${file.name}...`);
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
  setLoadedRootFile(data, file.name, typedName === file.name ? typedPath : "", append && allHistograms.length > 0);
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
  setLoadedRootFile(
    data,
    data.rootFileName || rootPath.split(/[\\/]/).pop(),
    data.rootFilePath || rootPath,
    allHistograms.length > 0,
  );
}

function setLoadedRootFile(data, rootFileName, rootFilePath = "", append = false) {
  currentFileId = data.fileId;
  currentRootFileName = rootFileName || "";
  currentRootFilePath = rootFilePath || "";
  rootPathInput.value = currentRootFilePath;
  loadedFiles.set(data.fileId, { fileId: data.fileId, rootFileName, rootFilePath, folders: data.folders || [] });
  collapsedFileGroups.add(data.fileId);
  const fileHistograms = data.histograms.map((hist) => ({
    ...hist,
    fileId: data.fileId,
    rootFileName,
    ref: `${data.fileId}::${hist.path}`,
  }));
  currentHist = append ? currentHist : null;
  allHistograms = append ? [...allHistograms, ...fileHistograms] : fileHistograms;
  rootFolders = data.folders || [];
  expandedFolders.clear();
  if (!append) comparePaths.clear();
  if (!append) legendSettings.clear();
  if (!append) {
    compareMode = false;
    panelMode = false;
    histSettings.clear();
  }
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
  showStatus(`${allHistograms.length} objects from ${loadedFiles.size} ROOT file${loadedFiles.size === 1 ? "" : "s"}`);
  refreshHistogramFilters();
  renderHistogramList(filteredHistograms());
}

function refreshHistogramFilters() {
  const selected = { file: fileFilterInput.value, kind: kindFilterInput.value, folder: folderFilterInput.value };
  const setOptions = (select, values, allLabel) => {
    select.innerHTML = `<option value="">${allLabel}</option>`;
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  };
  setOptions(fileFilterInput, Array.from(new Set(allHistograms.map((hist) => hist.rootFileName))).sort(), "All files");
  setOptions(kindFilterInput, Array.from(new Set(allHistograms.map((hist) => hist.kind))).sort(), "All types");
  setOptions(folderFilterInput, Array.from(new Set(allHistograms.map((hist) => hist.path.includes("/") ? hist.path.slice(0, hist.path.lastIndexOf("/")) : "(root)").filter(Boolean))).sort(), "All folders");
  fileFilterInput.value = selected.file;
  kindFilterInput.value = selected.kind;
  folderFilterInput.value = selected.folder;
  refreshDerivedInputs();
}

function refreshDerivedInputs() {
  const objects = allHistograms.filter((hist) => hist.kind === "TH1" || hist.kind === "TProfile");
  const fill = (select) => {
    const old = select.value;
    select.innerHTML = "";
    objects.forEach((hist) => {
      const option = document.createElement("option");
      option.value = hist.ref;
      option.textContent = `${hist.rootFileName}: ${hist.path}`;
      select.appendChild(option);
    });
    if (objects.some((hist) => hist.ref === old)) select.value = old;
  };
  fill(derivedAInput);
  fill(derivedBInput);
  derivedBInput.disabled = derivedOperationInput.value === "scale" || derivedOperationInput.value === "normalize";
}

async function createDerivedHistogram() {
  const a = allHistograms.find((hist) => hist.ref === derivedAInput.value);
  const b = allHistograms.find((hist) => hist.ref === derivedBInput.value);
  if (!a) return;
  const payload = { operation: derivedOperationInput.value, aPath: a.path, bPath: b?.path || "", bFileId: b?.fileId || "", coefficient: derivedCoefficientInput.value, name: derivedNameInput.value.trim() };
  try {
    const response = await fetch(`/api/files/${a.fileId}/derive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw await errorFromResponse(response, { endpoint: `/api/files/${a.fileId}/derive`, payload });
    const data = await response.json();
    const hist = { path: data.path, className: "TH1D", kind: "TH1", title: data.title, rootFileName: "Derived", fileId: a.fileId, ref: `${a.fileId}::${data.path}`, derivedId: data.derivedId };
    allHistograms = [...allHistograms, hist];
    refreshHistogramFilters();
    renderHistogramList(filteredHistograms());
    showStatus(`Created ${data.title}`);
    const button = Array.from(document.querySelectorAll(".hist-item")).find((item) => item.dataset.path === hist.ref);
    selectHistogram(hist, button || document.createElement("button"));
  } catch (error) {
    showError("Create derived histogram", error, { payload });
  }
}

function renderHistogramList(histograms) {
  histList.innerHTML = "";
  const appendHistogramItem = (hist, depth = 0) => {
    const button = document.createElement("button");
    button.className = "hist-item";
    button.type = "button";
    button.dataset.path = hist.ref;
    button.style.paddingLeft = `${9 + depth * 14}px`;
    button.innerHTML = `
      <input class="compare-check" type="checkbox" ${comparePaths.has(hist.ref) ? "checked" : ""} />
      <span>${escapeHtml(hist.path.split("/").pop())}</span>
      <small>${escapeHtml(hist.rootFileName)} · ${escapeHtml(hist.className)}</small>
    `;
    button.title = hist.path;
    button.querySelector(".compare-check").addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCompare(hist.ref, event.target.checked);
    });
    button.addEventListener("click", () => selectHistogram(hist, button));
    histList.appendChild(button);
  };

  const appendFileTree = (fileHistograms, fileFolders) => {
    const folders = new Set(fileFolders.map((folder) => folder.path));
    for (const hist of fileHistograms) {
      const parts = hist.path.split("/");
      for (let index = 1; index < parts.length; index += 1) {
        folders.add(parts.slice(0, index).join("/"));
      }
    }

    const appendFolder = (folderPath, depth) => {
      const directFolders = Array.from(folders)
      .filter((path) => path !== folderPath && path.startsWith(`${folderPath}/`) && path.slice(folderPath.length + 1).indexOf("/") === -1)
      .sort((a, b) => a.localeCompare(b));
      const directObjects = fileHistograms
      .filter((hist) => {
        const parent = hist.path.includes("/") ? hist.path.slice(0, hist.path.lastIndexOf("/")) : "";
        return parent === folderPath;
      })
      .sort((a, b) => a.path.localeCompare(b.path));

      for (const child of directFolders) {
      const row = document.createElement("div");
      row.className = "folder-row";
      row.style.paddingLeft = `${8 + depth * 14}px`;
        const childKey = `${fileHistograms[0]?.fileId}:${child}`;
        const isOpen = expandedFolders.has(childKey);
      row.innerHTML = `<button type="button" class="folder-toggle" aria-expanded="${isOpen}">${isOpen ? "▾" : "▸"}</button><span>${escapeHtml(child.split("/").pop())}</span>`;
      row.title = child;
      row.querySelector(".folder-toggle").addEventListener("click", () => {
        if (expandedFolders.has(childKey)) expandedFolders.delete(childKey);
        else expandedFolders.add(childKey);
        renderHistogramList(filteredHistograms());
      });
      histList.appendChild(row);
      if (isOpen) appendFolder(child, depth + 1);
      }

      for (const hist of directObjects) {
        appendHistogramItem(hist, depth + 1);
      }
    };

    for (const hist of fileHistograms.filter((item) => !item.path.includes("/")).sort((a, b) => a.path.localeCompare(b.path))) {
      appendHistogramItem(hist, 1);
    }
    for (const folder of Array.from(folders).filter((path) => !path.includes("/")).sort()) {
      const row = document.createElement("div");
      row.className = "folder-row";
      row.style.paddingLeft = "14px";
      const isOpen = expandedFolders.has(`${fileHistograms[0]?.fileId}:${folder}`);
      row.innerHTML = `<button type="button" class="folder-toggle" aria-expanded="${isOpen}">${isOpen ? "▾" : "▸"}</button><span>${escapeHtml(folder)}</span>`;
      row.title = folder;
      row.querySelector(".folder-toggle").addEventListener("click", () => {
        const key = `${fileHistograms[0]?.fileId}:${folder}`;
        if (expandedFolders.has(key)) expandedFolders.delete(key);
        else expandedFolders.add(key);
        renderHistogramList(filteredHistograms());
      });
      histList.appendChild(row);
      if (isOpen) appendFolder(folder, 2);
    }
  };

  const fileGroups = new Map();
  for (const hist of histograms) {
    if (!fileGroups.has(hist.fileId)) fileGroups.set(hist.fileId, []);
    fileGroups.get(hist.fileId).push(hist);
  }
  for (const [fileId, fileHistograms] of fileGroups) {
    const file = loadedFiles.get(fileId) || {};
    const isSearching = Boolean(searchInput.value.trim());
    const isCollapsed = collapsedFileGroups.has(fileId) && !isSearching;
    const header = document.createElement("button");
    header.className = "file-group-header";
    header.type = "button";
    header.setAttribute("aria-expanded", String(!isCollapsed));
    header.innerHTML = `<span class="file-group-chevron">${isCollapsed ? "▸" : "▾"}</span><span class="file-group-name">${escapeHtml(file.rootFileName || fileHistograms[0].rootFileName || "ROOT file")}</span><span class="file-group-count">${fileHistograms.length}</span>`;
    header.title = file.rootFilePath || header.textContent;
    header.addEventListener("click", () => {
      if (collapsedFileGroups.has(fileId)) collapsedFileGroups.delete(fileId);
      else collapsedFileGroups.add(fileId);
      renderHistogramList(filteredHistograms());
    });
    histList.appendChild(header);
    if (!isCollapsed) appendFileTree(fileHistograms, file.folders || []);
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
  customInput.checked = histSettings.has(objectStableKey(hist));
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
  const hist = allHistograms.find((item) => item.ref === path || item.path === path || objectStableKey(item) === path);
  if (!hist) {
    showError("Load project", new Error(`Object not found in current ROOT file: ${path}`));
    return;
  }
  const buttons = Array.from(document.querySelectorAll(".hist-item"));
  const button = buttons.find((item) => item.dataset.path === hist.ref);
  if (button) {
    selectHistogram(hist, button, render);
  } else {
    currentHist = hist;
    customInput.disabled = false;
    customInput.checked = histSettings.has(objectStableKey(hist));
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
  return allHistograms.filter((hist) => {
    const folder = hist.path.includes("/") ? hist.path.slice(0, hist.path.lastIndexOf("/")) : "(root)";
    const matchesQuery = !query || hist.path.toLowerCase().includes(query) || hist.className.toLowerCase().includes(query) || hist.rootFileName.toLowerCase().includes(query);
    return matchesQuery
      && (!fileFilterInput.value || hist.rootFileName === fileFilterInput.value)
      && (!kindFilterInput.value || hist.kind === kindFilterInput.value)
      && (!folderFilterInput.value || folder === folderFilterInput.value);
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
  applySelectedStyleButton.disabled = comparePaths.size < 1;
  exportSelectedButton.disabled = comparePaths.size < 1;
}

function selectedComparePaths() {
  return Array.from(comparePaths).filter((path) => {
    const hist = allHistograms.find((item) => item.ref === path);
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

function selectedCompareObjects() {
  return selectedComparePaths().map((ref) => {
    const hist = allHistograms.find((item) => item.ref === ref);
    return { fileId: hist.fileId, path: hist.path, label: hist.rootFileName ? `${hist.rootFileName}: ${hist.path}` : hist.path };
  });
}
