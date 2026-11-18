# Implementation Plan

gravekeeper-and-wager

## Overview

These tasks add the Gravekeeper, the three puzzles, quiet years and the verdict. The order is: pure copy and logic with tests, then the narrator, then each puzzle as a visible part with its own checkpoint, then the verdict and quiet years. The `honesty-review` hook reviews `src/copy/gravekeeper.ts`.

## Tasks

- [ ] 1. Copy and pure logic (tested)
- [ ] 1.1 `src/copy/gravekeeper.ts`: every line and card in Requirements 2–7, with templates that take only published fields
  - _Requirements: 2.1–2.7, 3.2, 4.3, 5.2, 5.3, 6.2, 6.3, 7.2–7.6_
- [ ] 1.2 `src/data/gravekeeper.ts`: `line`, `introLine`, `firstThaw`, `risingLine`, `whisperAt`, `glitchText`, `glitchOn`, `clueCard`, `riddleCards`, `checkRiddle`, `margin`, `verdictView`, `wagerScore`, `gravekeeperGuess`, `lanternRadius`, `fireFound`
  - _Requirements: 1.2, 2–7_
- [ ] 1.3 Property tests (fast-check) for Properties 1–7, plus published examples (2025 margin 2; the 2024 Gravekeeper's guess 3; 2026 quiet)
  - **Validates: Requirements 1.2, 2.2–2.4, 3.1, 3.3, 4.3, 4.5, 5.2, 5.3, 7.2–7.5**

- [ ] 2. Narrator
- [ ] 2.1 `useNarrator` (current line, replace, expiry timer) and `Gravekeeper.tsx` (the board's panel, typewriter, hairline, live region, reduced motion)
  - _Requirements: 1.1–1.4, 8.4_
- [ ] 2.2 Triggers: night arrival, season start, first thaw, risings (with marks), lantern lit
  - _Requirements: 2.1–2.5_
- [ ] 2.3 **Checkpoint:** narrator screenshots (night line, a beat line); link for the user
  - _Requirements: 9.1_

- [ ] 3. Read the stones
- [ ] 3.1 Wager state (marks, sealed, skipped), start gate at day 0, mark-by-stone with creak, clue card on hover/focus, mark candles, seal / just watch, lantern growth
  - _Requirements: 4.1–4.6, 8.1, 8.2_
- [ ] 3.2 **Checkpoint:** wager with a clue card and three marks
  - _Requirements: 9.1_

- [ ] 4. The Gravekeeper's riddle
- [ ] 4.1 `Riddle.tsx`: dialog after beat 1, four toggle cards, Dig / Let it lie, hint, the exhumation on success; the clock waits
  - _Requirements: 5.1–5.5, 8.1, 8.2_
- [ ] 4.2 **Checkpoint:** riddle screenshots (open, wrong pick with hint, solved)
  - _Requirements: 9.1_

- [ ] 5. Lantern hunt
- [ ] 5.1 Hidden fires under the lantern, found set, the lines, the counter
  - _Requirements: 6.1–6.4_
- [ ] 5.2 **Checkpoint:** lantern hunt screenshot
  - _Requirements: 9.1_

- [ ] 6. Verdict and quiet years
- [ ] 6.1 `Verdict.tsx` (the board card, detail, margin, wager line, Dig them up again) and the verdict line and bell
  - _Requirements: 7.1–7.6_
- [ ] 6.2 Whispers on days 22 / 48 / 76, the glitch (map jitter, narrator and Register substitution, unglitched accessible text), reduced motion off
  - _Requirements: 3.1–3.4_
- [ ] 6.3 Component tests (fake timers): the wager gates day 0; the riddle opens at beat 1 and holds the clock; the verdict in 2024 and 2026
  - _Requirements: 3, 4.1, 5.1, 7.1_
- [ ] 6.4 **Checkpoint:** zombie and quiet verdicts, a whisper with the glitch
  - _Requirements: 9.1_

- [ ] 7. Final check
- [ ] 7.1 Keyboard, contrast and reduced-motion pass on the new panels; `npm run check` and `npm run gate`; a `docs/KIRO_LOG.md` entry; commit
  - _Requirements: 8.1–8.4, 9.2_

## Task Dependency Graph

```
1 → 2 → 3 → 4 → 5 → 6 → 7
```

## Notes

- **Honesty:** every line names only published values. The Gravekeeper's own bet (the three largest) is a fixed rule, not a model.
- **The board's lines** are verbatim where they're true. Where they aren't ("Press play", "Fewer, and smaller", "the great fires of 2023" for 2025, "the biggest scars, where the snow leaves first"), design.md lists the replacement.
- **Commits:** one per task, with only the files that task touched.
