# Implementation Plan

daylight-nightfall

## Overview

These tasks add the daylight viewer, nightfall and the title card in front of the spec 03 graveyard, plus the wind and the drone. The opening is one fixed path: no skip and no sound control (design.md, "Immersion decision"). The order is: pure copy and derivations with tests, then the phase machine, then audio, then the screens. The user gets a local link and screenshots after each visible part (Requirement 10).

## Tasks

- [x] 1. Daylight copy and derivations (pure, tested)
- [x] 1.1 `src/copy/daylight.ts`: every daylight and title-card string, with the board claims corrected (design.md, "Board-to-app decisions")
  - _Requirements: 3.1, 3.4–3.9, 5.2, 5.3_
- [x] 1.2 `src/data/daylight.ts`: `daylightView()` (dots, rows, area snow, average, covered, re-ignited, clear, date label, credits) and `SCALE_60KM_PCT`
  - _Requirements: 2.3, 2.4, 3.1–3.6_
- [x] 1.3 Property tests (fast-check) for Properties 1, 2, 3 and 5, plus the example tests for the date and scale
  - **Property 1** area snow · **Property 2** average ignores missing · **Property 3** all clear · **Property 5** no number without a source
  - **Validates: Requirements 3.2–3.6, 3.9**

- [x] 2. Phase machine
- [x] 2.1 `src/scenes/useNightfall.ts`: `nightfallReducer` (no skip event), `initialPhase(search, dev)`, and timers (3200 / 6000 ms), with `onNight` firing once. `useGraveyard.initialState` reads `?season=` / `?day=` in dev only.
  - _Requirements: 1.1–1.3, 4.2, 4.3, 4.5, 6.1, 6.3_
- [x] 2.2 Property 4 (fast-check), plus fake-timer tests: the timer path, `onNight` once, `initialPhase` in dev and production
  - **Property 4** the phase moves one step at a time
  - **Validates: Requirements 4.2, 4.3, 6.1**

- [x] 3. Sound
- [x] 3.1 `src/audio/context.ts`, `wind.ts`, `drone.ts`, using the board's `startAudio` / `playDrone` values. All calls guarded; silent when there is no AudioContext; `startWind()` is idempotent.
  - _Requirements: 7.2–7.4_

- [x] 4. Daylight screen
- [x] 4.1 `src/scenes/Daylight.tsx` and `src/styles/daylight.css`: header, map (image, scar mask, border and labels, markers, layers card, zoom, scale bar, image credit), aside (status, stat cards, rows, night-shift card, credit). No sound toggle. Inert parts are text; 40 px buttons; AA colours; daylight focus outline.
  - _Requirements: 2.1–2.5, 7.1, 8.1, 8.2, 8.4_
- [x] 4.2 `src/scenes/Opening.tsx` and the `App.tsx` change: the scene by phase, sound started in the Night shift click, and a data failure still showing the error stone
  - _Requirements: 1.1, 1.4, 7.2, 7.4_
- [x] 4.3 **Checkpoint:** run `npm run dev`, give the user the link, and compare a 1440 × 1000 Playwright screenshot of the daylight view with the board values. Fix or report differences over 4 px.
  - _Requirements: 10.1_

- [ ] 5. Nightfall and title card
- [ ] 5.1 Dusk: `rv-dusk` on the daylight view, the sunset overlay, `rv-dot` on the markers, the board's keyframes in motion.css, and `rv-duskfade` for reduced motion
  - _Requirements: 4.1, 9.1, 9.2_
- [ ] 5.2 `src/components/TitleCard.tsx`: four lines with the board delays, the `rv-intro` fade, no controls, the card focused on open (`tabIndex = -1`)
  - _Requirements: 5.1–5.3, 6.2, 8.4_
- [ ] 5.3 Night arrival: Graveyard mounts on Spring 2024 day 0, tombstones emerge, focus moves to the headline, `onNight` seam
  - _Requirements: 1.3, 4.4, 4.5, 8.3_
- [ ] 5.4 Component tests (@testing-library/react, fake timers): Night shift → title → graveyard; Escape and clicks don't skip; no sound control in the DOM; focus on the card, then on the headline
  - _Requirements: 4.2, 6.1, 6.2, 7.1, 8.3_
- [ ] 5.5 **Checkpoint:** nightfall frames at 0 / 1.6 / 6.2 / 9.2 s with normal and with reduced motion; link for the user
  - _Requirements: 10.2_

- [ ] 6. Final check
- [ ] 6.1 Keyboard and contrast pass on the daylight view and title card; reduced-motion pass with Playwright; build check that `dist` has no dev-only parameter reads
  - _Requirements: 1.1, 1.2, 8.1–8.4, 9.1, 9.2_
- [ ] 6.2 **Final checkpoint:** `npm run check` and `npm run gate` green, screenshots, link, a `docs/KIRO_LOG.md` entry, commit
  - _Requirements: 10.1, 10.2_

## Task Dependency Graph

```
1 ─┬→ 4 → 5 → 6
2 ─┤
3 ─┘
```

- Tasks 1–3 have no UI to look at and don't depend on each other. Task 4.3 is the first user checkpoint, and 5.5 and 6.2 follow.
- Task 1 holds every daylight number, so task 4 only renders props.

## Notes

- **The board is a spec, not code.** Never paste its script. Port values and formulas into `src/` (AGENTS.md, design-boards skill).
- **The board can't render in this repo** (its `support.js` runtime is missing). Visual checks compare screenshots with the board's markup values, and the user reviews each checkpoint.
- **Immersion decision:** no skip and no sound control, here or in later specs. Spec 05 adds sounds but no Sound button.
- **The `honesty-review` hook** runs on `src/copy/` saves, so `src/copy/daylight.ts` is reviewed.
- **No rule logic in `src/`.** "Re-ignited" reads the published `rise.day`. The snow values are display averages of the published series, not a melt test.
- **Commits:** one per task, with only the files that task touched.
