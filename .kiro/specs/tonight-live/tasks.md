# Implementation Plan

tonight-live

## Overview
These tasks run in four groups:
1. The published ranking (pipeline).
2. Tonight and Keep watch in the graveyard.
3. The multi-page build and the three new pages, each with its own checkpoint.
4. Deploy, then a final check.

Task 1 needs a live `tonight` run, which uses the FIRMS key. Task 8 needs steps from the user: creating the Vercel project, adding three repository secrets, and pushing.

## Tasks
- [x] 1. Publish the watch ranking
- [x] 1.1 `pipeline/build.py`: `watch_order(rows)` and `watch` in `assemble_tonight`; `scripts/validate-data.mjs`: the permutation check; `docs/method.md`: the field, the formula, "a guide, not a forecast"
  - _Requirements: 2.1, 2.2_
- [x] 1.2 Tests: pytest + Hypothesis for Property 1; node tests for the validator (accept, duplicate, missing)
  - Also fixed a wrong assumption in spec 02's Property 9 test, found by Hypothesis: a melt on day 101 or 102 has fewer than 3 valid days left in its window, so it is never detected.
  - _Requirements: 2.1, 2.2_
- [x] 1.3 Run `uv run --python 3.12 python -m pipeline tonight` to republish `tonight.json` with `watch` (fresh data). Report the new `as_of`, warm count and top three to the user
  - as_of 2026-11-20T12:31:07Z, points through Nov 19, frame Nov 16; 9 still warm, 10 buried; `watch` opens G-24, G-01, G-02; still-warm top three G-24, G-02, G-16.
  - _Requirements: 2.1_

- [x] 2. Tonight, live
- [x] 2.1 `src/data/tonight.ts` + `src/copy/tonight.ts`: `staleness`, `meltSpread`, `wakeView`, `tonightLine`, `watchList`; types and loader read `watch`; `derive.ts` stops computing a score
  - _Requirements: 1.1–1.4, 2.3, 2.4, 3.1–3.4_
- [x] 2.2 Graveyard: footer ("They will wake", "Seen from orbit", "Data as of"), the stale tab and footer, the Tonight Gravekeeper line on entry, the subline, and the list sub
  - The subline already used the published buried count (spec 03). `useNow` ticks once a minute. The list heading now wraps its longer sub under the title.
  - _Requirements: 1.1–1.3, 3.1–3.4_
- [x] 2.3 Tests: fast-check Properties 2 and 3; a component test with a fixed clock (fresh and stale)
  - _Requirements: 1.3, 3.1, 3.2_
- [x] 2.4 **Checkpoint:** Tonight screenshots at 1440 × 1000, fresh and stale; link for the user
  - _Requirements: 9.3_

- [x] 3. Keep watch
- [x] 3.1 `keep` state and actions; `KeepWatch.tsx` (panel, slots, clue card, Seal the watch, Watch again); lantern marks on stones; the seal line and bell
  - A cold stone opens its exhumation as usual (it takes no lantern). `ClueCard` now takes plain lines, shared with the wager.
  - _Requirements: 4.1–4.4, 4.6, 4.7_
- [x] 3.2 `EpitaphCard.ts` and `cardLines`: the 1200 × 630 PNG, drawn after fonts load, downloaded locally
  - The site address is left blank until task 8. The credit is the file's own `credit`.
  - _Requirements: 4.5_
- [x] 3.3 Tests: Property 4; Property 5 for `cardLines`; a component test (only warm scars take lanterns; seal compares with `watch`)
  - _Requirements: 4.2, 4.4, 4.5_
- [x] 3.4 **Checkpoint:** Keep watch sealed, and the PNG card
  - _Requirements: 9.3_

- [x] 4. Multi-page build
- [x] 4.1 `vite.config.ts` `rollupOptions.input` for the four pages; `vercel.json` (`dist`, `cleanUrls`, `git.deploymentEnabled: false`); the Property 9 bundle scan (the `index.html` bundle reads no URL)
  - `scripts/check-bundle.mjs` walks every chunk `index.html` loads (scripts, preloads, static imports) and is now the last step of `npm run gate`. The three new pages start as placeholders for tasks 5–7.
  - _Requirements: 8.2, 8.3_

- [x] 5. The grave dossier
- [x] 5.1 `src/data/dossier.ts` + `src/copy/dossier.ts`: `dossierView`, `lateSnowBands`, `kml`, `parseHash`
  - _Requirements: 5.1–5.8_
- [x] 5.2 `Dossier.tsx` + `dossier.html`: hero, crops, rule checks, snow chart, life and afterlife, sightings, Export KML, Send to field crew; "Open the dossier" in the exhumation panel
  - Graves that did not rise get "Why it did not rise", a ✕ on the unmet checks, and "Laid to rest" or "Never stirred". The crop captions are the published snow % that day and the days to or from the thaw. The rise label sits above the 15 % line.
  - _Requirements: 5.1–5.9_
- [x] 5.3 Tests: Properties 5, 6 and 8; a component test for 2024 G-03 (Apr 15, May 26, 41 days, northern Alberta)
  - Property 5 runs over all 72 published graves.
  - _Requirements: 5.2–5.8_
- [x] 5.4 **Checkpoint:** dossier for 2024 G-03 at 1440 wide, next to the board
  - _Requirements: 9.3_

- [x] 6. The field-crew phone
- [x] 6.1 `src/data/phone.ts` + `src/copy/phone.ts`: `haversineKm`, `nearest`, `phoneView`, `shareText`, `mapsLink`
  - _Requirements: 6.2–6.5_
- [x] 6.2 `Phone.tsx` + `phone.html`: header, season switch, map crop, "Use my location" (on-device), the card, the quick report and share, nav, the hash
  - _Requirements: 6.1–6.7_
- [x] 6.3 Tests: Properties 5 and 7; a component test without and with a mocked position
  - _Requirements: 6.3–6.5_
- [x] 6.4 **Checkpoint:** phone at 390 × 844, next to the board
  - _Requirements: 9.3_

- [x] 7. The opening frame
- [x] 7.1 `OpeningFrame.tsx` + `opening.html` at 1920 × 1080, with the credit line fixed and reduced motion
  - _Requirements: 7.1–7.3_
- [x] 7.2 **Checkpoint:** opening at 1920 × 1080, next to the board
  - _Requirements: 9.3_

- [x] 8. Deploy
- [x] 8.1 `.github/workflows/deploy.yml`: on push to `main` and by hand; actions pinned to SHAs; `contents: read`; `npm ci`, `npm run gate`, then `vercel pull` / `vercel build --prod` / `vercel deploy --prebuilt --prod`, with the three secrets in `env`
  - _Requirements: 8.1, 8.4_
- [x] 8.2 **User steps:** `vercel link` (Hobby), a project-scoped token, the secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` in GitHub, then push. After that, check the live site: all four pages, data, images, and the Tonight dates
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 9. Final check
- [x] 9.1 Keyboard, contrast and reduced-motion pass on the new panels and pages; credits on every page; README live link; `docs/KIRO_LOG.md` entry; `npm run check`, `npm run gate`, pytest, script tests
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
