# Implementation Plan

graveyard-map

## Overview

These tasks build the night graveyard scene of `reference/design/Main.dc.html` in `src/`, wired to `public/data/`. The order is: scaffold, styles and data, then pure derivations with tests, then the scene region by region. The user gets a local preview link after each visible part (Requirement 20).

## Tasks

- [x] 1. Scaffold the app and turn on the UI hooks
- [x] 1.1 Create the Vite + React 19 + TypeScript (strict) project in the repo root. `public/` stays the public dir. Add ESLint, Vitest, fast-check and @testing-library/react.
  - npm scripts: `dev`, `build`, `test` (`vitest run`), `lint`, `typecheck` (`tsc --noEmit`), `check` (lint then typecheck), `gate` (test then build)
  - _Requirements: 1.1, 1.2, 1.4_
- [x] 1.2 Add `index.html` with the Google Fonts link from the board helmet (IM Fell English ital, IM Fell English SC, Inter 400/500/600, JetBrains Mono 400/500)
  - _Requirements: 3.2_
- [x] 1.3 Turn on the `ui-checks` hook (`npm run check --silent` on `src/.*\.(ts|tsx|css)$`) and the `task-gate` hook (`npm run gate --silent`, PostTaskExec) with the createHook tool. Delete the two drafts in `revenant-kit/kiro-drafts/.kiro/hooks/`.
  - _Requirements: 1.3_

- [x] 2. Styles
- [x] 2.1 `src/styles/tokens.css`: CSS variables for every token in `docs/design-reference.md`
  - _Requirements: 3.1_
- [x] 2.2 `src/styles/motion.css`: the rv-* keyframes this scene uses, plus the board's `prefers-reduced-motion` block, verbatim (helmet L18–101). `src/styles/base.css`: body, links, focus-visible, tab/button hover.
  - _Requirements: 18.1, 17.1_

- [x] 3. Data
- [x] 3.1 `src/data/types.ts` and `src/data/load.ts`: fetch both files, check their shape, parse the rows into objects, assign `G-nn`/`F-nn` ids
  - _Requirements: 2.1, 2.2_
- [x] 3.2 `src/data/imagery.ts`: keyframes, masks and the Tonight frame, citing `public/img/README.md` and `reference/design/blob-map.json`
  - _Requirements: 2.3_
- [x] 3.3 `src/data/format.ts` (dates from Mar 21, ISO dates, coordinates, km², region by x = 374, number words) and `src/data/state.ts` (`displayState`), with unit tests
  - _Requirements: 2.4_

- [x] 4. Derivations and copy (pure, tested)
- [x] 4.1 `src/copy/graveyard.ts`: every string and template for the scene, with the board's research-only claims corrected (design.md, "Board-to-app decisions")
  - _Requirements: 19.1, 19.2, 19.3_
- [x] 4.2 `src/data/derive.ts`: one pure function per region, ported from `renderVals()`. The regions are tabs, grave views, fires, callout, tooltip, headline/counts, list, register, legend, crossfade, flakes, candle, band, rise marks, lantern and exhumation.
  - _Requirements: 4.2, 4.4, 5.1–5.6, 6.1, 6.2, 7.2–7.4, 8.1–8.3, 9.1–9.3, 10.1, 10.2, 11.1, 11.2, 12.3, 12.4, 13.2, 15.1–15.4, 16.1–16.3_
- [x] 4.3 Property tests (fast-check) for Properties 1–8 in design.md
  - **Property 1** display states monotonic · **Property 2** counts add up · **Property 3** crossfade partition · **Property 4** callout on the map · **Property 5** list order · **Property 6** timeline drips · **Property 7** chart geometry · **Property 8** no number without a source
  - **Validates: Requirements 4.2, 5.1, 5.2, 7.3, 8.1, 8.2, 10.1, 12.4, 15.3, 19.1**

- [ ] 5. Page shell
- [ ] 5.1 `useGraveyard` (useReducer, initial state as the board constructor, season switch reset) and `Graveyard.tsx` layout: header, headline band, map + aside, footer
  - _Requirements: 3.1, 3.4_
- [ ] 5.2 `IronButton` (btn(on)), `SeasonTabs`, the brand, and the Lantern, Before / after and Night view buttons. Headline band with counts.
  - _Requirements: 3.2, 3.3, 8.1–8.3, 17.2_

- [ ] 6. Map stack and tombstones
- [ ] 6.1 `MapStack`: crossfading keyframes, grade, scar mask, fog, border line and labels, snowfall, grain, vignette, credit chip, Night view toggle
  - _Requirements: 4.1–4.5_
- [ ] 6.2 `Tombstone` (all state visuals) and `Candle` (new fires), plus the hit buttons
  - _Requirements: 5.1–5.6, 6.1, 17.1_
- [ ] 6.3 `Callout` and `Tooltip`; selection and hover
  - _Requirements: 6.2, 7.1–7.5_
- [ ] 6.4 **Checkpoint:** run `npm run dev`, give the user the link, and take a Playwright screenshot at 1440 × 1000 to compare with the board values. Fix or report differences over 4 px before going on.
  - _Requirements: 20.1, 20.2_

- [ ] 7. Right column
- [ ] 7.1 `Register` (rows, bars, footnote from the zombie flags, click to switch season)
  - _Requirements: 9.1–9.4_
- [ ] 7.2 `GraveCard` list and `Legend` (static note from `seasons.static`)
  - _Requirements: 10.1–10.3, 11.1, 11.2_

- [ ] 8. Candle timeline and replay clock
- [ ] 8.1 Replay clock in `useGraveyard` (100 ms tick, RV_PERIOD per speed, stop at 102, restart, `onRiseCrossed` seam)
  - _Requirements: 12.2, 12.6_
- [ ] 8.2 `CandleTimeline` (play, speeds, date labels, wax, stub, flame, glow, drips, window band, month ticks, accessible range)
  - _Requirements: 12.1, 12.3–12.5_
- [ ] 8.3 **Checkpoint:** link plus screenshots of days 0, 30, 60 and 102 for 2024; user review
  - _Requirements: 20.1, 20.2_

- [ ] 9. Overlays
- [ ] 9.1 `Exhumation` (sheet, epitaph, 3 crops, snow chart, rule checks, Escape/close with focus return)
  - _Requirements: 15.1–15.5, 17.3_
- [ ] 9.2 `Lantern` (veil, clipped true colour, ring, icon, names, keyboard focus follows) and `Compare` (split, divider, tags, range input)
  - _Requirements: 13.1–13.4, 14.1–14.3_

- [ ] 10. Tonight tab (basic)
- [ ] 10.1 Tonight states, warm scars, cluster glows, watch list, Tonight callout/epitaph/checks with the "crews confirm" caveat
  - _Requirements: 16.1–16.4_

- [ ] 11. Accessibility, reduced motion and the final check
- [ ] 11.1 Keyboard pass (tab order, Escape, focus return, aria-pressed, names, 40 px targets) and a contrast check
  - _Requirements: 17.1–17.4_
- [ ] 11.2 Reduced-motion pass with Playwright (`emulateMedia reducedMotion: 'reduce'`): no rv-* animation runs, and every element is in its final state
  - _Requirements: 18.1, 18.2_
- [ ] 11.3 **Final checkpoint:** `npm run gate` green, screenshots of every season, link for the user, and a `docs/KIRO_LOG.md` entry
  - _Requirements: 20.1, 20.2_

## Task Dependency Graph

```
1 → 2 → 3 → 4 → 5 → 6 → 7 ─┬→ 8 → 9 → 10 → 11
                           └────────────┘ (7 and 8 can run in parallel after 6)
```

- Tasks 1–4 have no UI to look at. Task 6 is the first user checkpoint, and 8.3 and 11.3 follow.
- Task 4 holds every number-producing function, so tasks 5–10 only render props.
- Task 10 reuses the components from tasks 6–9.

## Notes

- **The board is a spec, not code.** Never paste its script. Port values and formulas into `src/` (AGENTS.md, design-boards skill).
- **The board can't render in this repo:** its `support.js` runtime is missing. Visual checks therefore compare screenshots with the board's markup values, and the user reviews each checkpoint against the design.
- **The `honesty-review` hook** (an agent hook on `src/copy/` saves) uses credits on every run. Turn it on in task 4.1 only if the user agrees.
- **No rule logic in `src/`.** `displayState` is the published rule's display mapping. Melt, rise, chance and zombie come from `public/data/`.
