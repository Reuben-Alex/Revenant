---
inclusion: always
---
# Tech
- Frontend: React 19 + Vite + TypeScript, plain CSS with tokens as CSS variables, WebAudio for sound (no audio files). The UI displays published data; it holds no rule logic.
- No map library: the map is a fixed-bbox image stack (1060×716 grid) with absolutely positioned SVG layers.
- Fonts: IM Fell English (+SC), Inter, JetBrains Mono via Google Fonts.
- Rule engine and pipeline: Python 3.12 in `pipeline/`, managed with uv (requests, numpy, shapely, pyproj). Output JSON to `public/data/`. Nightly via GitHub Actions; secret `FIRMS_MAP_KEY`.
- Tests: pytest + Hypothesis (property-based) for the rule engine in `pipeline/rules/`; pytest for the rest of the pipeline; Vitest for UI logic; Playwright for visual snapshots.
- Always run Python through `uv run --python 3.12` (this machine's default Python is 3.14).
- Targets: last two versions of Chrome, Safari, Firefox; 1280px+ desktop primary, 390px phone view for crews.
