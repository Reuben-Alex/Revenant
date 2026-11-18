---
name: design-port
description: Port a Revenant design board (reference/design/*.dc.html) into React components and CSS. Use when building or restyling any scene or component so it matches the canvas exactly.
compatibility: Reads reference/design/ and docs/design-reference.md; no network needed.
---
# Porting design boards to React

The boards in `reference/design/` (Main, Phone, Dossier, Opening) are the visual source of truth. They use a small
template runtime. Translate it; don't copy the runtime.

| Board syntax | React equivalent |
|---|---|
| `<x-dc>` root, `<helmet>` (fonts, keyframes) | Scene component; keyframes move to `src/styles/motion.css`, fonts to `index.html` |
| `{{name}}` holes | props / state values |
| `<sc-for list="{{items}}" as="g">` | `items.map((g) => …)` with a stable `key` (grave id) |
| `<sc-if value="{{flag}}">` | `{flag && …}` |
| `class Component extends DCLogic`, `renderVals()` | a hook (`useGraveyard`) returning the same derived values; keep rule logic in `src/rules/` |
| `setState({...})` | `useState` / `useReducer` |
| `data-props` (accent, snowfall, storyBeats, showIntro) | top-level props with the same names and defaults |
| `/_blob/<id>` image URLs | `public/img/<file>` — mapping in `reference/design/blob-map.json` |
| `rv-*` keyframes | same names in CSS; every one needs a `prefers-reduced-motion` fallback (already defined in the board) |
| WebAudio in `playBell/playDrone/startAudio/playSting/playCreak` | `src/audio/*.ts`, same frequencies and envelopes |

## Steps
1. Open the board and list the regions you are porting (e.g. Parish Register, candle timeline, Gravekeeper panel).
2. Pull colours, type and spacing from `docs/design-reference.md` tokens — never hard-code a hex that has a token.
3. Port markup → component, then styles, then motion, then sound. Keep copy in `src/copy/` (honesty hook reviews it).
4. Compare: run the app and the board side by side (Playwright MCP screenshot at 1440×1000) and fix differences > 4 px.
5. Data comes only from `public/data/*.json` via `src/data/` loaders. Never paste numbers from the board's embedded `RV_RAW`.
