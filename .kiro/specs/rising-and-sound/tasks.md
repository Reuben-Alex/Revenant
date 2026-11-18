# Implementation Plan

rising-and-sound

## Overview

These tasks add the rising cinematic and its sounds to the spec 03 graveyard. The order is: pure planning with tests, then the sounds, then state and the clock hold, then the view. The user gets a link and screenshots of the first Spring 2024 rising at the checkpoint (Requirement 8). There is no Sound button (spec 04 immersion decision).

## Tasks

- [ ] 1. Rising plan (pure, tested)
- [ ] 1.1 `src/copy/rising.ts` (sting title, detail, live sentence) and `fissuresPath()` in `src/data/geometry.ts`
  - _Requirements: 2.1, 2.3, 3.4_
- [ ] 1.2 `src/data/rising.ts`: `risingsIn`, `planRising`, `cameraTransform`, `stingView`, and the timing constants
  - _Requirements: 1.1–1.3, 2.2, 2.4, 3.1, 3.2, 3.5, 5.2, 5.3_
- [ ] 1.3 Property tests (fast-check) for Properties 1–5, plus the published G-10 example
  - **Property 1** risings are the published rises · **Property 2** beat and camera gates · **Property 3** camera covers the frame · **Property 4** bells bounded · **Property 5** one flash per second
  - **Validates: Requirements 1.1–1.4, 2.2, 2.4, 3.1, 3.2, 3.5, 5.2, 5.3**

- [ ] 2. Sounds
- [ ] 2.1 Move the fake AudioContext to `src/audio/fakeAudio.ts`. Add `boom.ts`, `bell.ts` and `creak.ts` with the board values, using `currentAudio()` and staying silent without it. Add tests.
  - _Requirements: 5.1, 5.6_

- [ ] 3. State and clock hold
- [ ] 3.1 `useGraveyard`: `cam`, `sting`, `beats`, `lastFlash`, `lastStep`; the `rising`, `endCam` and `endSting` actions; the actions that end the hold; beat resets; clock hold; end timers; boom and bell on a plan; the `onRising` seam
  - _Requirements: 1.3, 1.4, 4.1–4.3, 5.2, 5.3, 6.1_
- [ ] 3.2 Property 6 and reducer tests (hold-ending actions, beat resets)
  - **Property 6** the clock holds
  - **Validates: Requirements 1.4, 4.1, 4.2**

- [ ] 4. Cinematic view
- [ ] 4.1 `MapStack` camera layer (`.rv-cam`, the board transitions), the cinematic slot inside it, the letterbox outside it, and the lead's small hand hidden while the cinematic is up
  - _Requirements: 3.2–3.4_
- [ ] 4.2 `Cinematic.tsx` (underglow, fissures and core, heave, hand, sparks) and `Sting.tsx` (flash keyed by `flashKey`, title, detail, live region); the map shake
  - _Requirements: 2.1, 2.3, 2.4, 3.4_
- [ ] 4.3 Creak on exhume; boom and bell on night arrival (`Opening` `onNight`)
  - _Requirements: 5.4, 5.5_
- [ ] 4.4 Reduced-motion CSS: no camera transform or transition, no letterbox, no sparks; the board's rules for the rest
  - _Requirements: 7.1, 7.2_
- [ ] 4.5 Component test (fake timers): play Spring 2024 to day 17; the sting shows G-10; the day holds 6 s; `onRising` gets beat 1; pausing ends the hold
  - _Requirements: 1.1, 2.1, 4.1, 4.2, 6.1_
- [ ] 4.6 **Checkpoint:** link and screenshots of the G-10 rising at 0.3 / 1.5 / 3 s, with normal and with reduced motion, compared with the board values
  - _Requirements: 8.1_

- [ ] 5. Final check
- [ ] 5.1 `npm run check` and `npm run gate` green; a flash-rate check at 2× on Spring 2024 days 27–34; a `docs/KIRO_LOG.md` entry; commit
  - _Requirements: 2.4, 8.2_

## Task Dependency Graph

```
1 ─┬→ 3 → 4 → 5
2 ─┘
```

- Tasks 1 and 2 have no UI and don't depend on each other. Task 4.6 is the user checkpoint.

## Notes

- **The board is a spec, not code.** Port values and formulas into `src/`, and never paste the script (AGENTS.md).
- **Honesty:** every rising, date, day count and point comes from `seasons.json`. The UI doesn't decide what rose.
- **Immersion decision:** sound is always on, with no Sound button or mute.
- **Commits:** one per task, with only the files that task touched.
