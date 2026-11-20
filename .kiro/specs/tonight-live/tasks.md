# Implementation Plan

tonight-live

## Overview
These tasks run in four groups:
1. The published ranking (pipeline).
2. Tonight and Keep watch in the graveyard.
3. The multi-page build and the three new pages, each with its own checkpoint.
4. Deploy, then a final check.

Task 1 needs a live `tonight` run, which uses the FIRMS key. Task 8 needs two steps from the user: enabling Pages and pushing.

## Tasks
- [ ] 1. Publish the watch ranking
- [ ] 1.1 `pipeline/build.py`: `watch_order(rows)` and `watch` in `assemble_tonight`; `scripts/validate-data.mjs`: the permutation check; `docs/method.md`: the field, the formula, "a guide, not a forecast"
  - _Requirements: 2.1, 2.2_
- [ ] 1.2 Tests: pytest + Hypothesis for Property 1; node tests for the validator (accept, duplicate, missing)
  - _Requirements: 2.1, 2.2_
- [ ] 1.3 Run `uv run --python 3.12 python -m pipeline tonight` to republish `tonight.json` with `watch` (fresh data). Report the new `as_of`, warm count and top three to the user
  - _Requirements: 2.1_

- [ ] 2. Tonight, live
- [ ] 2.1 `src/data/tonight.ts` + `src/copy/tonight.ts`: `staleness`, `meltSpread`, `wakeView`, `tonightLine`, `watchList`; types and loader read `watch`; `derive.ts` stops computing a score
  - _Requirements: 1.1–1.4, 2.3, 2.4, 3.1–3.4_
- [ ] 2.2 Graveyard: footer ("They will wake", "Seen from orbit", "Data as of"), the stale tab and footer, the Tonight Gravekeeper line on entry, the subline, and the list sub
  - _Requirements: 1.1–1.3, 3.1–3.4_
- [ ] 2.3 Tests: fast-check Properties 2 and 3; a component test with a fixed clock (fresh and stale)
  - _Requirements: 1.3, 3.1, 3.2_
- [ ] 2.4 **Checkpoint:** Tonight screenshots at 1440 × 1000, fresh and stale; link for the user
  - _Requirements: 9.3_

- [ ] 3. Keep watch
- [ ] 3.1 `keep` state and actions; `KeepWatch.tsx` (panel, slots, clue card, Seal the watch, Watch again); lantern marks on stones; the seal line and bell
  - _Requirements: 4.1–4.4, 4.6, 4.7_
- [ ] 3.2 `EpitaphCard.ts` and `cardLines`: the 1200 × 630 PNG, drawn after fonts load, downloaded locally
  - _Requirements: 4.5_
- [ ] 3.3 Tests: Property 4; Property 5 for `cardLines`; a component test (only warm scars take lanterns; seal compares with `watch`)
  - _Requirements: 4.2, 4.4, 4.5_
- [ ] 3.4 **Checkpoint:** Keep watch sealed, and the PNG card
  - _Requirements: 9.3_

- [ ] 4. Multi-page build and base path
- [ ] 4.1 `src/data/assets.ts` and every runtime URL through `asset()`; `vite.config.ts` `base` and `rollupOptions.input` for the four pages; the Property 9 source scan; check that the prod bundle of `index.html` reads no URL
  - _Requirements: 8.2, 8.3_

- [ ] 5. The grave dossier
- [ ] 5.1 `src/data/dossier.ts` + `src/copy/dossier.ts`: `dossierView`, `lateSnowBands`, `kml`, `parseHash`
  - _Requirements: 5.1–5.8_
- [ ] 5.2 `Dossier.tsx` + `dossier.html`: hero, crops, rule checks, snow chart, life and afterlife, sightings, Export KML, Send to field crew; "Open the dossier" in the exhumation panel
  - _Requirements: 5.1–5.9_
- [ ] 5.3 Tests: Properties 5, 6 and 8; a component test for 2024 G-03 (Apr 15, May 26, 41 days, northern Alberta)
  - _Requirements: 5.2–5.8_
- [ ] 5.4 **Checkpoint:** dossier for 2024 G-03 at 1440 wide, next to the board
  - _Requirements: 9.3_

- [ ] 6. The field-crew phone
- [ ] 6.1 `src/data/phone.ts` + `src/copy/phone.ts`: `haversineKm`, `nearest`, `phoneView`, `shareText`, `mapsLink`
  - _Requirements: 6.2–6.5_
- [ ] 6.2 `Phone.tsx` + `phone.html`: header, season switch, map crop, "Use my location" (on-device), the card, the quick report and share, nav, the hash
  - _Requirements: 6.1–6.7_
- [ ] 6.3 Tests: Properties 5 and 7; a component test without and with a mocked position
  - _Requirements: 6.3–6.5_
- [ ] 6.4 **Checkpoint:** phone at 390 × 844, next to the board
  - _Requirements: 9.3_

- [ ] 7. The opening frame
- [ ] 7.1 `OpeningFrame.tsx` + `opening.html` at 1920 × 1080, with the credit line fixed and reduced motion
  - _Requirements: 7.1–7.3_
- [ ] 7.2 **Checkpoint:** opening at 1920 × 1080, next to the board
  - _Requirements: 9.3_

- [ ] 8. Deploy
- [ ] 8.1 `.github/workflows/deploy.yml` (checkout, setup-node, `npm ci`, `npm run gate`, upload-pages-artifact, deploy-pages; permissions `pages: write`, `id-token: write`)
  - _Requirements: 8.1, 8.4_
- [ ] 8.2 **User steps:** enable Pages (Source: GitHub Actions) and push. Then check the live site: all four pages, data, images, and the Tonight dates
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 9. Final check
- [ ] 9.1 Keyboard, contrast and reduced-motion pass on the new panels and pages; credits on every page; README live link; `docs/KIRO_LOG.md` entry; `npm run check`, `npm run gate`, pytest, script tests
  - _Requirements: 9.1–9.4_

## Task Dependency Graph

```
1 → 2 → 3
4 → 5 → 6 → 7 → 8 → 9
(2 and 3 can run before or after 4)
```

## Notes
- **Honesty:** every line names only published values. The ranking is a guide, not a forecast. Late heat always says "crews confirm".
- **Immersion:** the main page keeps spec 04's rule. The new pages are separate, and read only their own hash.
- **Commits:** one per task, with only that task's files.
