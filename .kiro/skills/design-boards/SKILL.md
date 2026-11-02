---
name: design-boards
description: Read the Revenant design boards in reference/design/*.dc.html and turn them into React/CSS that matches. Use when building or checking any screen, component, animation or sound against the design.
---
# Reading the design boards

Each `.dc.html` board is a template plus a logic class. The boards don't run on their own, so read them as a precise spec and write new code in `src/`. Never paste board scripts into the app.

| In the board | Meaning |
|---|---|
| Inline `style="…"` | The exact look: colours, sizes, spacing, gradients. Match these values. |
| `{{name}}` | A value from `renderVals()`. Search for `name:` in the script to find how it's computed. |
| `<sc-if value="{{x}}">` | Shown only when `x` is true. `hint-placeholder-val` is a preview default, not behaviour. |
| `<sc-for>` | A repeated element. |
| `class Component extends DCLogic` | Behaviour: state in the constructor, timing in `tick()`, derived values in `renderVals()`. |
| `/_blob/<id>` | An image. Look up its file in `reference/design/blob-map.json`. |
| `data-props` | Design levers such as the accent colour. Use the defaults. |

## Boards
- `Main.dc.html`: graveyard map, daylight viewer, nightfall (1440 wide, fluid)
- `Phone.dc.html`: field crew view (390×844)
- `Dossier.dc.html`: grave dossier, G-03 Spring 2024 (1440 wide, fluid)
- `Opening.dc.html`: video opening frame (1920×1080)

## Where things are in Main.dc.html
Search by name, because line numbers can drift.

| Feature | Markup blocks | Logic |
|---|---|---|
| Map and tombstones | `nightReady` (L179), `hasTip` (L258) | `renderVals()` (L856) |
| Before/after | `compareOn` (L268, L343) | `toggleCompare`, `onSplit` |
| Lantern | `lanternOn` (L275) | `toggleLantern`, `onMapMove` area (L1314) |
| Exhumation panel | `exOpen` (L350) | `closeEx` |
| Candle timeline | `isReplay` (L441, L456) | `onScrub`, `RV_PERIOD` (L597) |
| Tonight footer | `isTonight` (L484) | |
| Daylight viewer | `dayOn` (L492) | `toggleDaySound` |
| Title card | `intro` (L574) | `nightfall()` (L676) |
| Rising | `camOn` (L209, L263), `hasSting` (L300) | `tick()` (L703) |
| Sound | | `playBell()` (L784), `startAudio()` (L798), `stopAudio()` (L822) |
| Gravekeeper | `hasSay` (L308) | `say()` (L699), `RV_INTRO_LINES` (L631), `RV_WHISPERS` (L636) |
| Wager | `wagerOpen` (L326) | `seal`, `skip` (L1370) |
| Verdict | `hasVerdict` (L290) | `tick()` (L721), `quiet()` (L675) |

## Data values embedded in the board
`RV_RAW` (L586) matches `data/seasons.json`. `RV_CHANCE` (L593) and `RV_SEASONS` are design constants, so in the app these values must come from `public/data/`, as `honesty.md` requires.

## Checking a build
Use the Playwright MCP server to screenshot the built screen at the board's size, then compare it with the board's markup values. Also check that `prefers-reduced-motion` has a working fallback.
