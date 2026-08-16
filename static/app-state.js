const fileInput = document.querySelector("#fileInput");
const rootPathInput = document.querySelector("#rootPathInput");
const openRootPathButton = document.querySelector("#openRootPathButton");
const dropZone = document.querySelector("#dropZone");
const statusBox = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");
const fileFilterInput = document.querySelector("#fileFilterInput");
const kindFilterInput = document.querySelector("#kindFilterInput");
const folderFilterInput = document.querySelector("#folderFilterInput");
const compareButton = document.querySelector("#compareButton");
const previewPanelButton = document.querySelector("#previewPanelButton");
const panelButton = document.querySelector("#panelButton");
const applySelectedStyleButton = document.querySelector("#applySelectedStyleButton");
const exportSelectedButton = document.querySelector("#exportSelectedButton");
const histList = document.querySelector("#histList");
const plotImage = document.querySelector("#plotImage");
const selectionOverlay = document.querySelector("#selectionOverlay");
const selectionBox = document.querySelector("#selectionBox");
const peakOverlay = document.querySelector("#peakOverlay");
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
const resetSettingsButton = document.querySelector("#resetSettingsButton");
const dpiInput = document.querySelector("#dpiInput");
const aspectRatioInput = document.querySelector("#aspectRatioInput");
const lineWidthInput = document.querySelector("#lineWidthInput");
const lineColorInput = document.querySelector("#lineColorInput");
const lineStyleInput = document.querySelector("#lineStyleInput");
const markerStyleInput = document.querySelector("#markerStyleInput");
const lineAlphaInput = document.querySelector("#lineAlphaInput");
const colormapInput = document.querySelector("#colormapInput");
const showBinValuesInput = document.querySelector("#showBinValuesInput");
const textFontSizeInput = document.querySelector("#textFontSizeInput");
const normalizationInput = document.querySelector("#normalizationInput");
const showErrorsInput = document.querySelector("#showErrorsInput");
const showLegendInput = document.querySelector("#showLegendInput");
const uncertaintyBandInput = document.querySelector("#uncertaintyBandInput");
const derivedOperationInput = document.querySelector("#derivedOperationInput");
const derivedAInput = document.querySelector("#derivedAInput");
const derivedBInput = document.querySelector("#derivedBInput");
const derivedCoefficientInput = document.querySelector("#derivedCoefficientInput");
const derivedNameInput = document.querySelector("#derivedNameInput");
const createDerivedButton = document.querySelector("#createDerivedButton");
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
const panelSharedZInput = document.querySelector("#panelSharedZInput");
const panelEqualRangesInput = document.querySelector("#panelEqualRangesInput");
const panelTitlesInput = document.querySelector("#panelTitlesInput");
const panelSpacingInput = document.querySelector("#panelSpacingInput");
const panelGlobalTitleInput = document.querySelector("#panelGlobalTitleInput");
const objectInfo = document.querySelector("#objectInfo");
const copyDiagnosticsButton = document.querySelector("#copyDiagnosticsButton");
const diagnosticsOutput = document.querySelector("#diagnosticsOutput");
const analysisXMinInput = document.querySelector("#analysisXMinInput");
const analysisXMaxInput = document.querySelector("#analysisXMaxInput");
const showAnalysisRangeInput = document.querySelector("#showAnalysisRangeInput");
const analysisResults = document.querySelector("#analysisResults");
const peakSensitivityInput = document.querySelector("#peakSensitivityInput");
const peakSensitivityValue = document.querySelector("#peakSensitivityValue");
const peakResults = document.querySelector("#peakResults");
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
const loadedFiles = new Map();
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
let rootFolders = [];
const expandedFolders = new Set();
const collapsedFileGroups = new Set();
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

function activeFileId() {
  return currentHist?.fileId || currentFileId;
}
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
  showBinValues: false,
  textFontSize: "auto",
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
  analysisXMin: "",
  analysisXMax: "",
  showAnalysisRange: false,
};
const histSettings = new Map();
const DEFAULT_SETTINGS = { ...globalSettings };

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

