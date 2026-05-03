# Histogram Style Web

**Histogram Style Web** is a browser-based tool for turning CERN ROOT histograms
and graphs into clean, reproducible, publication-ready figures.

It is built for physicists, analysts, students, and collaborators who need to
move quickly from a `.root` file to plots suitable for slides, notes, papers,
internal reviews, and reports without manually tuning ROOT canvases every time.

The app runs locally in your browser, reads ROOT files with `uproot`, renders
figures with Matplotlib, and gives you a compact workflow for styling,
comparison, multi-panel figures, analysis, fitting, and export.

## What You Can Do

- Drag and drop a `.root` file into the browser.
- Browse supported ROOT objects recursively.
- Render `TH1`, `TH2`, `TProfile`, `TProfile2D`, and `TGraph` objects.
- Apply built-in publication and presentation style presets.
- Customize labels, fonts, colors, line styles, markers, axis ranges, log
  scales, DPI, aspect ratio, colormaps, and normalization.
- Compare multiple 1D histograms or profiles as overlays, ratios,
  differences, or percent differences.
- Build and preview multi-panel figures before exporting.
- Run lightweight analysis on selected 1D ranges.
- Add quick visual fits and inspect fit quality summaries.
- Export single plots, comparison plots, panel figures, or all objects.
- Export selected histogram data as machine-readable JSON for LLM-assisted
  analysis.
- Save and reload reproducible project JSON files.

## Quick Start

### 1. Install Python

Use Python 3.10 or newer. Python 3.12 is recommended.

```bash
python --version
```

On some Linux/macOS systems:

```bash
python3 --version
```

### 2. Clone the Repository

```bash
git clone https://github.com/qweek2/hist-style-web.git
cd hist-style-web
```

### 3. Create a Virtual Environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 5. Run the App

```bash
uvicorn app:app --reload
```

Open:

```text
http://127.0.0.1:8000
```

Then drag and drop a `.root` file into the upload area.

If the interface looks stale after updating the project, refresh the browser
with `Ctrl+F5`.

## Typical Workflow

1. Upload or open a ROOT file.
2. Select an object from the list on the left.
3. Use the `Render` tab to tune the plot style.
4. Use the `Analysis` tab for range integrals, fits, and warnings.
5. Select multiple objects for comparison or panel figures.
6. Export the result as `PNG`, `PDF`, or `SVG`.
7. Use `Export for LLM` when you want numeric histogram data for a chat or
   notebook-based interpretation step.
8. Save a project JSON when you need reproducibility.

## Supported ROOT Objects

Currently supported:

- `TH1*`
- `TH2*`
- `TProfile`
- `TProfile2D`
- `TGraph*`

Common examples:

- `TH1F`, `TH1D`
- `TH2F`, `TH2D`
- `TProfile`
- `TProfile2D`
- `TGraph`, `TGraphErrors`, `TGraphAsymmErrors`

Not yet supported:

- `THStack`
- `TEfficiency`
- saved `TCanvas` styling

## Rendering and Styling

Histogram Style Web exposes the figure settings that usually matter for real
scientific plots:

- DPI: `100`, `150`, `200`, `250`, `300`, `400`
- aspect ratio, including `1:1`, `4:3`, `16:9`, `16:10`
- linear/log scales for X, Y, and Z
- manual X/Y/Z ranges
- title, X label, Y label
- title, label, and tick font sizes
- font family
- line color, width, style, alpha
- marker style
- optional error bars
- optional uncertainty band
- colormap
- normalization mode
- output format: `PNG`, `PDF`, `SVG`

For 2D histograms and `TProfile2D`, zero-content regions are rendered with a
white background so empty areas are not visually confused with real data.

ROOT labels are sanitized before rendering. The app avoids blindly treating
ROOT-style text as Matplotlib mathtext, which makes labels such as `\Deltay`,
`E_{kin}`, and ratio-like expressions much more robust during export.

## Style Presets

Built-in presets:

- `Journal`: clean default style for notes and reports.
- `Presentation`: larger typography and slide-friendly proportions.
- `HEP`: conservative high-energy-physics style.
- `Nature-like`: compact publication-oriented styling.
- `Dark slides`: dark theme for presentation figures.

The presets configure typography, line weights, tick styling, colors,
colormaps, and export-oriented defaults. Font stacks include common scientific
and presentation-friendly fallbacks such as Arial, Helvetica, Liberation Sans,
DejaVu Sans, Inter, Aptos, and Segoe UI.

## Compare Mode

Select two or more compatible `TH1` or `TProfile` objects with the checkboxes in
the object list, then click `Compare selected`.

Available comparison modes:

- overlay
- ratio to the first selected object
- difference from the first selected object
- percent difference from the first selected object

The first selected object is used as the reference for ratio and difference
plots. Ratio and difference modes require identical binning.

Each curve can have its own:

- legend label
- color, or automatic Matplotlib color
- line style
- marker style
- alpha/transparency

By default, comparison curves use automatic colors, solid lines, no markers,
and alpha `1`.

## Panel Figures

Panel mode lets you compose several selected objects into one figure.

Controls include:

- number of columns
- shared X axis
- shared Y axis
- equal ranges
- panel titles
- global panel title
- subplot spacing

Use `Preview panel` to inspect the multi-panel figure in the browser before
exporting it. Equal-range panels include a small Y headroom so the highest bins
do not touch the frame.

## Analysis

The `Analysis` tab provides a compact first-pass analysis view for 1D objects.

It currently reports:

- interpretation metadata for normalization, integral definition, fit input,
  profile semantics, and active log scales
- selected range integral
- fraction of total integral inside the selected range
- selected-range mean and RMS
- entries and useful plot warnings
- fit parameters when fitting is enabled
- chi2/ndf
- residual and pull summaries

You can type `Analysis X min` and `Analysis X max` manually, or select a range
directly on the plot by dragging across the histogram while the `Analysis` tab
is active.

Analysis v1 focuses on `TH1` and `TProfile`. Other supported objects still
render normally, but advanced range statistics are intentionally limited until
their semantics are handled explicitly.

## Fits

Fits are controlled from the `Analysis` tab.

Available models:

- Gaussian
- exponential
- `pol0`
- `pol1`
- `pol2`
- `pol3`
- `pol4`
- `pol5`
- `pol6`

`Fit X min` and `Fit X max` restrict the fit range without changing the visible
axis range. Leave them empty to fit the available histogram range.

The current fit implementation is intended for quick visual inspection and
presentation plots. It is not a replacement for a full statistical ROOT/Minuit
workflow with rigorous parameter uncertainties.

## Summary Line

The plot preview can show a compact summary line below the figure. It is meant
to provide useful physics-oriented context without overwhelming the plot.

Depending on the object type, it may include:

- entries
- integral
- mean X and RMS X
- mean Y and RMS Y when meaningful
- min/max values

Bin-count details are intentionally omitted from the summary line.

## Reproducible Projects

Use `Save project` to store the current plotting session as a JSON file.

A project records:

- project schema and creation time
- app version
- source ROOT file name
- optional source ROOT local path metadata
- selected object
- global render settings
- per-object settings
- compare selections
- compare labels and per-curve styles
- panel settings
- analysis range
- export format

The current project format uses:

```json
{
  "schema": "hist-style-web.project",
  "schemaVersion": 2
}
```

Older project files with `hist-style-web.project.v1` are migrated in the
browser when loaded. Unsupported future schema versions fail explicitly instead
of being partially applied.

Project files do not contain ROOT data. To restore a session, load the same
ROOT file and then choose `Load project`. If the project contains a local ROOT
path and the app is running on the same machine, it can try to reopen that file
automatically.

Browsers do not expose the real path of a drag-and-dropped file. If you want a
project to remember the local ROOT path, paste it into `Optional local ROOT
path` or open the file through the local path input.

## Export

Supported export paths:

- current single plot
- current comparison plot
- current panel figure
- all discovered objects as a ZIP archive
- selected object data as JSON for LLM-assisted analysis

`Export all` includes a `manifest.json` file inside the ZIP archive. The
manifest records the app version, manifest schema version, source ROOT metadata,
output filenames, object paths, object kinds, global settings, and per-object
settings used for each exported figure.

Supported formats:

- `PNG`
- `PDF`
- `SVG`

### Export for LLM

`Export for LLM` downloads a JSON file with numeric data instead of a rendered
image. If one or more objects are checked in the object list, those objects are
exported. If nothing is checked, the currently displayed object is exported.

The JSON includes object metadata, ROOT class, title, axis labels, entries,
summary statistics, bin edges, bin values, and available errors. `TH2` and
`TProfile2D` exports include X/Y bin edges and a 2D value array. `TGraph`
exports include X/Y point arrays and available point errors.

This is intended for lightweight interpretation workflows where an LLM or
notebook needs the underlying numbers rather than pixels from a rendered plot.

Recommended choices:

- Papers: `PDF` or `SVG` for line plots, `PNG` at 300 DPI or higher for raster
  output.
- Presentations: `PNG` at 200-400 DPI, usually with `16:9` aspect ratio.
- Dense 2D histograms: `PNG` is often safer because vector files can become
  very large.

## Diagnostics and Robustness

The app includes frontend diagnostics for failed requests. When a render,
analysis, export, compare, or project operation fails, the Diagnostics section
can show copyable debug information including endpoint, payload, status, and
message.

The backend also validates common user-facing errors before rendering:

- invalid ranges where min is greater than max
- unsupported log scales with non-positive values
- fits with too few points
- compare ratio/difference requests with incompatible binning
- unsupported fit usage in compare or panel mode

Several ROOT/Matplotlib edge cases are handled defensively, including unsafe
labels, mathtext parse failures, log tick formatting, and missing `to_numpy()`
support for profiles.

The Analysis tab also surfaces scientific interpretation warnings, including
non-raw normalization, bin-width normalization, profile semantics, log-scale
rejections of non-positive values, and fits performed on normalized displayed
values.

## Local ROOT Paths

For local work, you can paste a filesystem path into `Optional local ROOT path`
and open it through the backend. This is useful for reproducible project files
because the project can remember where the ROOT file came from.

This feature is controlled by:

```text
ALLOW_LOCAL_FILE_OPEN=1
```

It is enabled by default for local runs and disabled by default on Render.

## Privacy

When you run the app locally, ROOT files stay on your machine.

Uploaded files are stored temporarily in:

```text
uploads/
```

Generated exports are stored in:

```text
exports/
```

Both directories are ignored by Git.

## Configuration

Environment variables:

```text
APP_VERSION=0.2.0
ASSET_VERSION=0.2.0
MAX_UPLOAD_MB=200
UPLOAD_TTL_SECONDS=3600
ALLOW_LOCAL_FILE_OPEN=1
```

`APP_VERSION` is embedded into project files, export manifests, and `/api/version`.

`ASSET_VERSION` is appended to frontend CSS/JS URLs. Change it when deploying
new frontend assets if it differs from `APP_VERSION`.

`MAX_UPLOAD_MB` limits uploaded ROOT file size.

`UPLOAD_TTL_SECONDS` controls how long uploaded files are kept before automatic
cleanup.

`ALLOW_LOCAL_FILE_OPEN` controls whether the backend can open a ROOT file from
a local filesystem path.

Example on Linux/macOS:

```bash
MAX_UPLOAD_MB=500 UPLOAD_TTL_SECONDS=7200 uvicorn app:app
```

Example on Windows PowerShell:

```powershell
$env:MAX_UPLOAD_MB="500"
$env:UPLOAD_TTL_SECONDS="7200"
uvicorn app:app
```

## Docker

Build:

```bash
docker build -t hist-style-web .
```

Run:

```bash
docker run --rm -p 8000:10000 hist-style-web
```

Open:

```text
http://127.0.0.1:8000
```

## Deploying to Render

The repository includes:

- `Dockerfile`
- `render.yaml`

Deploy flow:

1. Push the repository to GitHub.
2. Create a Render Blueprint or Web Service from the repository.
3. Use the Docker runtime.
4. Configure environment variables if needed.
5. Deploy.

The app reads Render's `PORT` environment variable automatically.

Useful Render settings:

```text
MAX_UPLOAD_MB=200
UPLOAD_TTL_SECONDS=3600
ALLOW_LOCAL_FILE_OPEN=0
```

Render free instances sleep after inactivity. The first request after sleep can
take 30-60 seconds or more.

## Development

Run with auto-reload:

```bash
uvicorn app:app --reload
```

Basic import check:

```bash
python -c "import app, plotting, root_reader; print('imports ok')"
```

Basic syntax check:

```bash
python -m py_compile app.py plotting.py root_reader.py
```

Project layout:

```text
hist-style-web/
  app.py
  plotting.py
  root_reader.py
  static/
    index.html
    app.js
    style.css
  uploads/
  exports/
  requirements.txt
  Dockerfile
  render.yaml
```

## Troubleshooting

### The page did not update after pulling changes

Use a hard refresh:

```text
Ctrl+F5
```

### Upload fails

Check that the file extension is `.root` and that `MAX_UPLOAD_MB` is large
enough for the file.

### Log scale fails

Log scales require positive values on the relevant axis. Use linear scale or
set a positive manual range.

### Compare ratio or difference fails

Ratio and difference modes require identical binning. Use overlay mode for
objects with different bin edges.

### Export fails because of labels

The app contains several fallback paths for ROOT label rendering. If a label
still fails, simplify the title or axis label and copy the Diagnostics output
for debugging.

### Project does not reopen the ROOT file automatically

Browsers do not expose drag-and-drop file paths. Upload the matching ROOT file
manually, or run locally and use `Optional local ROOT path` before saving the
project.

## License

No license has been declared yet.
