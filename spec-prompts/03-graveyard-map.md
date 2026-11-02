# Spec prompt — graveyard-map (Requirements-first)
Build the main night scene from `reference/design/Main.dc.html` and #[[file:docs/design-reference.md]]: image-stack map with
keyframe crossfade by day, scar mask layer, tombstones with states from published data, new-fire candles, callout card,
season tombstone tabs (2024/2025/2026/Tonight), Parish Register (observed vs chance), carved grave cards list, legend,
candle timeline with scrubbing and ½×/1×/2× speed, lantern mode, before/after split, hover tooltip, exhumation panel
(epitaph, 3 crops, snow curve with 50-day band, rule checklist). Keyboard accessible; reduced-motion fallbacks. Data from `public/data/`.

Grave state comes from a small helper in `src/data/` that turns the current day plus a grave's published melt and rise into a display state. It holds no rule logic beyond that.
Scaffold first: Vite + React 19 + TypeScript with the npm scripts in `AGENTS.md`, CSS tokens from the design reference, then set `enabled: true` in `.kiro/hooks/ui-checks.json`.
Until the pipeline runs, copy `data/seasons.json` to `public/data/seasons.json` as a fixture, adding each season's `chance` from `docs/method.md` (2024 0.347, 2025 0.365, 2026 0.201). Never edit `data/`.

Design source (use skill /design-boards): `Main.dc.html` blocks `nightReady` L179, `hasTip` L258, `compareOn` L268 and L343, `lanternOn` L275, `exOpen` L350, timeline `isReplay` L441 and L456; logic in `renderVals()` L856.
