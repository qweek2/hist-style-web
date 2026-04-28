# Histogram Style Web

Histogram Style Web is a small local-first web application for turning CERN ROOT
histograms into cleaner, publication-ready plots rendered with Matplotlib.

It reads `.root` files with `uproot`, detects common histogram and graph
objects, and lets you preview, restyle, compare, fit, arrange, and export them
from a browser.

The app is designed for physicists and analysts who often need the same ROOT
histograms in slides, notes, papers, and reports, but do not want to keep
manually tuning ROOT canvas styles.

## Local Installation

### 1. Install Python

Install Python 3.10 or newer. Python 3.12 is recommended.

Check that Python is available:

```bash
python --version
```

On some Linux/macOS systems the command may be:

```bash
python3 --version
```

### 2. Download the project

Clone the repository:

```bash
git clone https://github.com/qweek2/hist-style-web.git
cd hist-style-web
```

Or download it as a ZIP archive from GitHub and unpack it.

### 3. Create a virtual environment

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

### 4. Install dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

This installs:

- FastAPI and Uvicorn for the local web server
- uproot for reading ROOT files
- NumPy for histogram data handling
- Matplotlib for rendering plots

### 5. Run the app

```bash
uvicorn app:app --reload
```

Open this URL in your browser:

```text
http://localhost:8000
```

Now drag and drop a `.root` file into the page.

## Quick Usage

1. Drop a ROOT file into the upload area.
2. Select a histogram from the list.
3. Adjust style settings in the middle settings panel.
4. Export the current plot as PNG, PDF, or SVG.
5. Use `Export all` to download all histograms as a ZIP archive.

## Features

- Drag-and-drop `.root` file upload
- Recursive discovery of `TH1*`, `TH2*`, `TProfile*`, and `TGraph*` objects
- Clean Matplotlib rendering
- PNG, PDF, and SVG export
- Batch export to ZIP
- Per-histogram custom style overrides
- Save/load style presets as JSON
- Search/filter histograms by name
- Object information panel with ROOT class, title, entries, ranges, bins, or points
- Compare multiple `TH1`/`TProfile` objects on one plot
- Advanced comparison modes:
  - overlay
  - ratio to the first selected object
  - difference from the first selected object
  - relative difference in percent
- Edit legend labels for comparison plots
- Per-curve compare styling:
  - automatic or custom color
  - line style
  - marker
  - alpha/transparency
- Optional uncertainty band for the reference curve
- Preview and export selected objects as a multi-panel figure
- Multi-panel controls:
  - number of columns
  - shared X/Y axes
  - equal ranges
  - panel titles
  - global panel title
  - subplot spacing
- Optional error bars
- Linear/log scale controls for X, Y, and Z/color scale
- Manual axis ranges for X, Y, and Z
- Aspect ratio control, for example `1:1`, `4:3`, `16:9`
- Summary line with entries, integral, mean, and RMS
- Optional summary embedded into exported images
- Optional fit overlay for 1D objects
- Independent fit range controls for X
- Fit models:
  - Gaussian
  - exponential
  - pol0, pol1, pol2, pol3, pol4, pol5, pol6
- TH1 normalization modes:
  - raw
  - area = 1
  - max = 1
  - divide by bin width

## Style Presets

The app includes several built-in style presets:

- `Journal`
- `Presentation`
- `HEP`
- `Nature-like`
- `Dark slides`

The presets configure fonts, line widths, font sizes, colors, tick direction,
colormaps, and export-friendly defaults.

The journal-oriented presets use conservative sans-serif font stacks such as
Arial, Helvetica, Liberation Sans, and DejaVu Sans. The Docker image installs
Liberation fonts so that deployed Linux environments have a stable Arial-like
fallback.

## Supported ROOT Objects

Currently supported:

- `TH1*`
- `TH2*`
- `TProfile*`
- `TGraph*`

Examples:

- `TH1F`
- `TH1D`
- `TH2F`
- `TH2D`
- `TProfile`
- `TGraph`
- `TGraphErrors`
- `TGraphAsymmErrors`

Not yet supported:

- `THStack`
- `TEfficiency`
- saved `TCanvas` styling

## Compare Mode

Select two or more `TH1*` or `TProfile*` objects using the checkboxes in the
object list, then click `Compare selected`.

The first selected object is used as the reference for ratio and difference
plots. Ratio and difference modes require identical binning.

Comparison plots support:

- custom legend labels
- per-curve colors
- solid/dashed/dash-dot/dotted line styles
- optional markers
- alpha/transparency
- optional uncertainty band for the reference curve

If no per-curve color is selected, the app uses Matplotlib's automatic color
cycle. By default, compare curves use solid lines, no markers, and alpha 1.

## Fit Mode

Enable `Show fit` in the `Fit` section for a selected 1D object.

Available models:

- Gaussian
- exponential
- polynomial fits from `pol0` to `pol6`

`Fit X min` and `Fit X max` restrict the fit range without changing the visible
plot range. Leave them empty to fit the full histogram range.

The current fit implementation is a lightweight NumPy-based visual fit intended
for quick presentation and inspection plots. It is not a replacement for a full
statistical ROOT/Minuit fit with parameter errors and fit-quality diagnostics.

## Local Privacy Notes

When you run the app locally, your ROOT files stay on your own machine.

Uploaded files are stored temporarily in:

```text
uploads/
```

They are ignored by Git.

## Server Settings

The app supports these environment variables:

```text
MAX_UPLOAD_MB=200
UPLOAD_TTL_SECONDS=3600
```

`MAX_UPLOAD_MB` limits uploaded ROOT file size.

`UPLOAD_TTL_SECONDS` controls how long uploaded files are kept before automatic
cleanup. The default is one hour.

Example:

```bash
MAX_UPLOAD_MB=500 UPLOAD_TTL_SECONDS=7200 uvicorn app:app
```

Windows PowerShell:

```powershell
$env:MAX_UPLOAD_MB="500"
$env:UPLOAD_TTL_SECONDS="7200"
uvicorn app:app
```

## Docker

Build the Docker image:

```bash
docker build -t hist-style-web .
```

Run it:

```bash
docker run --rm -p 8000:10000 hist-style-web
```

Open:

```text
http://localhost:8000
```

## Deploying to Render

This repository includes:

- `Dockerfile`
- `render.yaml`

To deploy on Render:

1. Push this repository to GitHub.
2. Open Render.
3. Create a new Blueprint or Web Service from the repository.
4. Use the Docker runtime.
5. Select the free plan if appropriate.

The app automatically reads Render's `PORT` environment variable.

Useful Render environment variables:

```text
MAX_UPLOAD_MB=200
UPLOAD_TTL_SECONDS=3600
```

Important: free Render instances spin down after inactivity. The first request
after a sleep period may take around 30-60 seconds.

## Recommended Export Formats

For papers:

- PDF or SVG for line plots
- PNG at 300 DPI or higher if raster output is needed

For presentations:

- PNG at 200-300 DPI
- 16:9 aspect ratio
- `Presentation` or `Dark slides` preset

For 2D histograms:

- PNG is often safer for dense heatmaps
- PDF/SVG can become large for very fine binning

## Development

Run with auto-reload:

```bash
uvicorn app:app --reload
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

## License

Add your preferred license here.
