---
inclusion: always
---
# Tech
- Frontend: React 19 + Vite + TypeScript, plain CSS with tokens as CSS variables, WebAudio for sound (no audio files).
- No map library: the map is a fixed-bbox image stack (1060×716 grid) with absolutely positioned SVG layers.
- Fonts: IM Fell English (+SC), Inter, JetBrains Mono via Google Fonts.
- Pipeline: Python 3.12 in `pipeline/` (requests, numpy, shapely, pyproj, pyshp for NBAC shapefiles, Pillow for GIBS frames and image output). Output JSON to `public/data/`. Nightly via GitHub Actions; secret `FIRMS_MAP_KEY`.
- Tests: Vitest + fast-check (property-based) for the rule engine in `src/rules/`; pytest for the pipeline; Playwright for visual snapshots.
- Targets: last two versions of Chrome, Safari, Firefox; 1280px+ desktop primary, 390px phone view for crews.