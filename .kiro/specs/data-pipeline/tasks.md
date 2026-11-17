# Implementation Plan

data-pipeline

## Overview

Builds the FIRMS/GIBS/NBAC pipeline in `pipeline/` that publishes `public/data/seasons.json` and `public/data/tonight.json`
from Engine results (spec 01). The order is: pure modules with offline tests first, then the validator, then live runs,
the comparison report and the nightly job. No test in `pytest` touches the network. Live runs are separate, explicit
tasks. The decisions at the end of `design.md` (dependencies, cloud masking, following the firms-points and gibs-imagery skills) are agreed.

## Tasks

- [x] 1. Dependencies, config and grid
- [x] 1.1 Add runtime dependencies to `pyproject.toml`: `requests`, `numpy`, `shapely`, `pyproj`, `pyshp`, `pillow`; run `uv lock`; update `.kiro/steering/tech.md` to list `pyshp` and `pillow`
  - _Requirements: 3.2, 5.1_
- [x] 1.2 Write `pipeline/config.py`: bbox, grid size, season dates (Mar 21, 103 days), FIRMS sources per period, thresholds (1000 m, 15 px, 2000 px, 5 % black), and `firms_key()` (env, then `.env`, else exit message naming both)
  - _Requirements: 1.1, 1.2, 1.8_
- [x] 1.3 Write `pipeline/grid.py` (lon/lat ↔ grid, EPSG:3978 transformer) and `test_grid.py`, including **Property 1: Grid round trip**
  - _Requirements: 3.1_

- [x] 2. Fetch layer (offline-tested)
- [x] 2.1 Write `pipeline/http.py`: one session, 1 request/s throttle, 3 retries (2, 8, 30 s), key redaction in every message
  - _Requirements: 1.5, 1.6, 1.7_
- [x] 2.2 Write `pipeline/firms.py`: `fetch_range`, `fetch_period` (5-day pages), every page cached and never re-fetched, NRT only for completed UTC days, `budget()`; reject bodies without a CSV header
  - _Requirements: 1.1–1.5, 1.7_
- [x] 2.3 Write `pipeline/gibs.py` (`frame()` with cache, None on error) and `pipeline/nbac.py` (download + cache the annual zip, read with pyshp, reproject to EPSG:3978)
  - _Requirements: 3.2, 3.7, 5.1_
- [x] 2.4 Tests with a fake session: paging, caching (no re-fetch), NRT completed-days rule, header check, retries, budget stop; **Property 2: Paging covers the period exactly once**; **Property 10: The key never leaks**
  - _Requirements: 1.3–1.8_

- [ ] 3. Points
- [ ] 3.1 Write `pipeline/points.py`: `parse`, `dedupe`, `recurring_cells` (≥ 3 of the last 4 complete years, from cleaned SP), `clean` (confidence n/h, SP type 2/3, bbox, NRT recurring cells)
  - _Requirements: 2.1–2.6_
- [ ] 3.2 Tests from CSV snippets (SP with `type`, NRT without), including **Property 3: Dedupe is idempotent and order-free** and **Property 4: Cleaning only removes**
  - _Requirements: 2.1–2.5_

- [ ] 4. Scars and proximity
- [ ] 4.1 Write `pipeline/scars.py` (NBAC scars clipped to bbox, rank by area, mask, size_px, centroid, 1 km buffer) and `pipeline/hulls.py` (2 px dilation, connected components)
  - _Requirements: 3.2–3.5_
- [ ] 4.2 Write `pipeline/proximity.py` (`on_scar`, ≤ 1000 m in EPSG:3978)
  - _Requirements: 4.1, 4.2, 4.3_
- [ ] 4.3 Tests on tiny polygons and point grids, including **Property 5: Proximity agrees with distance**
  - _Requirements: 3.3–3.5, 4.1, 4.2_

- [ ] 5. Snow
- [ ] 5.1 Write `pipeline/snow.py`: snow/cloud/clear per scar pixel (snow wins); fraction = snow ÷ (snow + clear); > 50 % cloud → None for that scar; snow frame < 2000 px or a failed frame → None for all
  - _Requirements: 5.1–5.5_
- [ ] 5.2 Tests with synthetic snow and cloud RGBA frames, including **Property 6: Snow fraction is a fraction of the known scar pixels**
  - _Requirements: 5.2–5.4_

- [ ] 6. Chance and new fires
- [ ] 6.1 Write `pipeline/chance.py` (offsets, acceptance, `find_rise` per offset, seeded RNG) and `pipeline/newfires.py` (15 px test, 3 px clustering, top 24)
  - _Requirements: 6.1–6.3, 7.1–7.3_
- [ ] 6.2 Tests, including **Property 7: Chance is a reproducible rate** and **Property 8: New fires are far from scars**
  - _Requirements: 6.1–6.3, 7.1, 7.2_

- [ ] 7. Data contract validator
- [ ] 7.1 Write `scripts/validate-data.mjs` (Node built-ins only): shapes and invariants for both files; exit 0/1 with JSON paths
  - _Requirements: 10.1, 10.2, 10.3_
- [ ] 7.2 Write `scripts/validate-data.test.mjs` (`node --test`): a valid example and one broken example per invariant
  - _Requirements: 10.1, 10.2_
- [ ] 7.3 Enable the `data-contract` hook with the createHook tool (PostFileSave, matcher `public/data/.*\.json$`, `node scripts/validate-data.mjs`) and delete the draft in `revenant-kit/kiro-drafts/.kiro/hooks/`
  - _Requirements: 10.4_

- [ ] 8. Build and publish the replay seasons
- [ ] 8.1 Write `pipeline/build.py` (`build_season`) and `pipeline/publish.py` (temp file → validator → atomic replace; mask PNGs)
  - _Requirements: 3.6, 5.5, 8.1–8.4_
- [ ] 8.2 Write `pipeline/__main__.py` with the `seasons` command
  - _Requirements: 8.3, 8.4_
- [ ] 8.3 Tests: **Property 9: Published grave rows match the engine**; a golden test of `build_season(2024)` on a small recorded cache fixture
  - _Requirements: 8.1–8.3_
- [ ] 8.4 Live run: check `budget()`, run `uv run python -m pipeline seasons`, confirm the validator passes; report risen / chance / zombie per season to the user before committing
  - _Requirements: 1.5, 8.3, 8.4_
- [ ] 8.5 Update `docs/method.md` (schema additions, −1 melt, `tonight.json`, FIRMS/NBAC build method)
  - _Requirements: 8.5_

- [ ] 9. Tonight
- [ ] 9.1 Write `pipeline/keyframe.py` (cloud score, > 5 % black skipped) and `build_tonight` in `pipeline/build.py`
  - _Requirements: 9.1–9.4_
- [ ] 9.2 Add the `tonight` command (`--today YYYY-MM-DD`, default UTC today) and tests for 14-day hits, 3-day snow max, clusters and stale-frame keep
  - _Requirements: 9.1–9.5_
- [ ] 9.3 Live run: `uv run python -m pipeline tonight`; confirm the validator passes; report counts to the user
  - _Requirements: 9.1–9.5_

- [ ] 10. Comparison with the research
- [ ] 10.1 Write `pipeline/compare.py` (IoU matching, side-by-side table, cleaning counts incl. dropped `l` points, method differences, melt days with vs without the cloud mask) and tests on small fixtures
  - _Requirements: 12.1–12.6_
- [ ] 10.2 Live run: `uv run python -m pipeline compare`; review `docs/pipeline-vs-research.md` with the user
  - _Requirements: 12.1–12.4_

- [ ] 11. Nightly GitHub Actions job
- [ ] 11.1 Write `.github/workflows/nightly.yml`: daily at 10:00 UTC + manual dispatch, `astral-sh/setup-uv`, cache `pipeline/cache/`, `FIRMS_MAP_KEY` secret, run `tonight`, commit only the two outputs when changed, `permissions: contents: write`
  - _Requirements: 11.1–11.5_

- [ ] 12. Final checks
- [ ] 12.1 Run `uv run --python 3.12 pytest -q pipeline` with `HYPOTHESIS_PROFILE=ci` and `node --test scripts/`; all green. Add a 3-line entry to `docs/KIRO_LOG.md`
  - _Requirements: 8.4, 10.2_

## Task Dependency Graph

```
1 → 2 → 3 → 4 ─┬→ 5 ─┐
               └→ 6 ─┼→ 8 → 9 → 11
1 → 7 ──────────────┘    8 → 10
                           all → 12
```

- Task 1 comes first: it adds the dependencies and the grid every module uses.
- Task 7 (the Node validator) depends only on the published schema, so it can run in parallel with tasks 2–6.
- Tasks 5 (snow) and 6 (chance, new fires) can run in parallel after task 4, because both need scars.
- Task 8 needs 3–7: it calls every module and validates its output.
- Tasks 9 (Tonight) and 10 (comparison) both need 8. Task 11 (nightly job) needs 9.
- Within a task, sub-tasks run in the order listed.

## Notes

- `public/data/` is written only by the pipeline process (`publish.py`). The `guard-data` hook blocks agent file tools there, so no agent edits a published number by hand.
- Live-run tasks (8.4, 9.3, 10.2) use FIRMS transactions (about 200 pages for the three springs, plus about 800 one-off pages of full-year SP 2022–2025 for the NRT recurrence filter; the limit is 5000 per 10 minutes) and download NBAC zips of up to 181 MB. Check `budget()` first and report results to the user before committing them.
- The key stays in `.env` locally (gitignored) and in the `FIRMS_MAP_KEY` repository secret for the nightly job.
- `data/seasons.json` stays frozen. The comparison report reads it and never writes it.
- The design-first workflow was followed by hand: `design.md` was written first, then `requirements.md`, then this plan.
