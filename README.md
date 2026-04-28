# Histogram Style Web

Minimal local web app for previewing ROOT `TH1`/`TH2` histograms with a cleaner
Matplotlib style.

## Install

```powershell
python -m pip install -r requirements.txt
```

## Run

```powershell
uvicorn app:app --reload
```

Open:

```text
http://localhost:8000
```

## Current MVP

- drag and drop `.root` file
- list `TH1*` and `TH2*` objects
- preview selected histogram
- export PNG/PDF/SVG
- batch export to ZIP
- style presets via JSON
- compare several TH1 histograms

## Render deploy

Create a new Render Web Service from this repository. Use the Docker runtime.

The app reads Render's `PORT` environment variable automatically.

Useful environment variables:

- `MAX_UPLOAD_MB=200`
- `UPLOAD_TTL_SECONDS=3600`
