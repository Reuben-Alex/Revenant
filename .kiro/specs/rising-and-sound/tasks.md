# Implementation Plan

rising-and-sound

## Overview

These tasks add the rising cinematic and its sounds to the spec 03 graveyard. They also make the replay run by itself, with no play/pause button. The order is: pure planning with tests, then the sounds, then state and the clock, then the view. The user gets a link and screenshots at the checkpoint (Requirement 8). There is no Sound button (spec 04 immersion decision).

## Tasks

- [x] 1. Rising plan (pure, tested)
- [x] 1.1 `src/copy/rising.ts` (sting title, detail, live sentence) and `fissuresPath()` in `src/data/geometry.ts`. The footer sub-labels go with the footer copy in task 4.1.
  - _Requirements: 2.1–2.3, 3.4_
- [x] 1.2 `src/data/rising.ts`: `risingsIn`, `planRising`, `cameraTransform`, `stingView`, and the timing constants
  - _Requirements: 1.1–1.3, 2.2, 2.4, 3.1, 3.2, 3.5, 5.2, 5.3_
- [x] 1.3 Property tests (fast-check) for Properties 1–5, plus the published G-10 example
  - **Property 1** risings are the published rises · **Property 2** beat and camera gates · **Property 3** camera covers the frame · **Property 4** bells bounded · **Property 5** one flash per second
  - **Validates: Requirements 1.1–1.4, 2.2, 2.4, 3.1, 3.2, 3.5, 5.2, 5.3**

- [x] 2. Sounds
- [x] 2.1 Move the fake AudioContext to `src/audio/fakeAudio.ts`. Add `boom.ts`, `bell.ts` and `creak.ts` with the board values, using `currentAudio()` and staying silent without it. Add tests.
  - _Requirements: 5.1, 5.6_

- [ ] 3. State and clock
- [ ] 3.1 `useGraveyard`: the self-running replay (`running`, `dragging`, `startGate`, no `play` action, restart on choosing a season) and `clockMayAdvance`
  - _Requirements: 9.1–9.4, 9.6_
- [ ] 3.2 `useGraveyard`: `cam`, `sting`, `beats`, `lastFlash`, `lastStep`; the `rising`, `endCam` and `endSting` actions; the actions that end the hold; beat resets; end timers; boom and bell on a plan; the `onRising` seam
  - _Requirements: 1.3, 1.4, 4.1–4.3, 5.2, 5.3, 6.1_
- [ ] 3.3 Properties 6 and 7, plus reducer tests (hold-ending actions)
  - **Property 6** the clock waits · **Property 7** the replay restarts cleanly
  - **Validates: Requirements 1.4, 4.1, 4.2, 9.2–9.4**

- [ ] 4. View
- [ ] 4.1 `CandleTimeline` without the play button; the sub-labels in `copy.footer` (running at a speed, waiting while you look, the spring is over); `scrubStart` / `scrubEnd` on the range input. Spec 03 tests updated to the new footer.
  - _Requirements: 9.1, 9.3, 9.5_
- [ ] 4.2 `MapStack` camera layer (`.rv-cam`, the board transitions), the cinematic slot inside it, the letterbox outside it, and the lead's small hand hidden while the cinematic is up
  - _Requirements: 3.2–3.4_
- [ ] 4.3 `Cinematic.tsx` (underglow, fissures and core, heave, hand, sparks) and `Sting.tsx` (flash keyed by `flashKey`, title, detail, live region); the map shake
  - _Requirements: 2.1, 2.3, 2.4, 3.4_
- [ ] 4.4 Creak on exhume; boom and bell on night arrival (`Opening` `onNight`)
  - _Requirements: 5.4, 5.5_
- [ ] 4.5 Reduced-motion CSS: the zoom cuts in and out (no transition), no shake, no sparks; the board's rules for the rest
  - _Requirements: 7.1, 7.2_
- [ ] 4.6 Component test (fake timers): the replay runs with no play button; the sting shows G-10 at day 17; the day holds 6 s; `onRising` gets beat 1; opening an exhumation ends the hold and the day waits until it closes
  - _Requirements: 1.1, 2.1, 4.1, 4.2, 6.1, 9.1–9.3_
- [ ] 4.7 **Checkpoint:** link and screenshots of the G-10 rising at 0.3 / 1.5 / 3 s, with normal and with reduced motion, compared with the board values
  - _Requirements: 8.1_

- [ ] 5. Final check
- [ ] 5.1 `npm run check` and `npm run gate` green; a flash-rate check at 2× on Spring 2024 days 27–34; a `docs/KIRO_LOG.md` entry; commit
  - _Requirements: 2.4, 8.2_

## Task Dependency Graph

```
1 ─┬→ 3 → 4 → 5
2 ─┘
```

- Tasks 1 and 2 have no UI and don't depend on each other. Task 4.7 is the user checkpoint.

## Notes

- **The board is a spec, not code.** Port values and formulas into `src/`, and never paste the script (AGENTS.md).
- **Honesty:** every rising, date, day count and point comes from `seasons.json`. The UI doesn't decide what rose.
- **Immersion decisions:** sound is always on, with no Sound button or mute (spec 04), and there is no play/pause button (this spec, Requirement 9).
- **Commits:** one per task, with only the files that task touched.
