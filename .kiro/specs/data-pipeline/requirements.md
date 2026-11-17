# Requirements Document

data-pipeline

## Introduction

The pipeline turns NASA and NRCan open data into the two files the app shows: `public/data/seasons.json` (three replay
springs) and `public/data/tonight.json` (the live season). It replaces the imagery-based research run with FIRMS 375 m
points and NBAC polygons. That gives a real 1 km "on the scar" test instead of ~1–3 km. Every rule decision comes from
`pipeline/rules/` (spec 01). Design: `design.md`; method and schema: #[[file:docs/method.md]].

## Glossary

- **Pipeline:** the code in `pipeline/` outside `pipeline/rules/`.
- **Engine:** `pipeline/rules/` (spec 01).
- **Point:** one FIRMS VIIRS 375 m detection.
- **SP / NRT:** FIRMS standard processing (archive) and near-real-time sources.
- **Scar:** a burned-area polygon for one fire year. **Grave:** one of the 24 largest scars of year Y−1, used for season Y.
- **Grid:** the 1060×716 design grid; x = (lon + 126) / 17 · 1060, y = (60 − lat) / 6 · 716.
- **Recurring cell:** a 375 m cell (point rounded to 0.004°) with SP detections inside the bbox (counted before the confidence and `type` filters, so FIRMS-flagged flares count) in ≥ 3 of the last 4 complete calendar years; used to remove static heat (gas flares, industry) from NRT points, which carry no `type`.
- **Season day:** day 0 = Mar 21 (UTC) of the season year; days 0–102.

## Requirements

### Requirement 1: Fetching FIRMS points

**User Story:** As the team, I want every FIRMS download cached and paged correctly, so that results are reproducible and the key's transaction limit is never wasted.

#### Acceptance Criteria

1. THE Pipeline SHALL fetch replay seasons from `VIIRS_SNPP_SP`, `VIIRS_NOAA20_SP` and `VIIRS_NOAA21_SP`, and Tonight from SP up to the SP end date, then `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT` and `VIIRS_SNPP_NRT` where each has data.
2. THE Pipeline SHALL request the area `-126,54,-109,60`.
3. THE Pipeline SHALL page a date period in requests of at most 5 days that together cover every day of the period exactly once.
4. THE Pipeline SHALL cache every response under `pipeline/cache/` and never re-fetch a cached page; for NRT it SHALL request only completed UTC days (through `today − 1`).
5. THE Pipeline SHALL send at most 1 request per second and SHALL stop with exit code 1 before a run would exceed the key's transaction limit.
6. THE Pipeline SHALL NOT write the key to logs, exception messages, cache file names, output files or commits.
7. IF a page fails after 3 retries or returns a body without a CSV header, THEN THE Pipeline SHALL fail the run rather than treat the page as having no fires.
8. THE Pipeline SHALL read the key from the environment variable `FIRMS_MAP_KEY`, or else from a `FIRMS_MAP_KEY=` line in the repo-root `.env`; IF neither exists, THEN it SHALL exit 1 with a message naming both places.

### Requirement 2: Cleaning points

**User Story:** As a duty officer, I want gas flares and doubtful detections removed, so that a flare stack never raises a grave.

#### Acceptance Criteria

1. THE Pipeline SHALL parse `latitude, longitude, acq_date, acq_time, confidence, satellite`, and `type` when present.
2. THE Pipeline SHALL de-duplicate points across sources by (latitude, longitude, acq_date, acq_time).
3. THE Pipeline SHALL keep only points with confidence `n` or `h`.
4. THE Pipeline SHALL drop SP points with `type` 2 (static land source) or 3 (offshore).
5. THE Pipeline SHALL drop points outside the bbox, and NRT points in a recurring cell.
6. THE Pipeline SHALL publish `static` in `seasons.json` as the number of distinct cells with a dropped SP `type` 2/3 spring point, and in `tonight.json` as the number of recurring cells.

### Requirement 3: Grid and scars

**User Story:** As the graveyard map, I want each grave's shape and position on the design grid, so that tombstones and scar masks line up with the imagery.

#### Acceptance Criteria

1. THE Pipeline SHALL convert lon/lat to grid x/y with the formulas in docs/method.md and nowhere else.
2. WHEN building season Y for Y in 2024–2026, THE Pipeline SHALL take scars from the NBAC annual polygons for year Y−1, clipped to the bbox.
3. WHEN building Tonight, THE Pipeline SHALL take scars from detection hulls of the current year's cleaned May 1–Oct 31 points (dilated 2 px, connected components), because NBAC for that year is not released.
4. THE Pipeline SHALL select the 24 largest scars by area as graves, ordered largest first, so that ids `G-01`…`G-24` and `BA-01`…`BA-24` follow size.
5. THE Pipeline SHALL compute for each scar a grid mask, `size_px` (mask pixel count) and the centroid in grid x/y.
6. THE Pipeline SHALL write `public/img/scars-<Y−1>.png` for each season (and the current year for Tonight) as a 1060×716 RGBA image, white, with alpha marking every scar of that year.
7. IF an NBAC download or read fails, THEN THE Pipeline SHALL fail the `seasons` run and SHALL NOT fall back to hulls for that year.

### Requirement 4: On the scar

**User Story:** As a fire crew lead, I want "on the scar" to mean within 1 km of the real burn perimeter, so that a Risen grave is worth a patrol.

#### Acceptance Criteria

1. THE Pipeline SHALL measure distance in EPSG:3978 metres.
2. THE Pipeline SHALL mark a point on a scar WHEN its distance to the scar polygon is ≤ 1000 m.
3. THE Pipeline SHALL pass only on-scar points to the Engine, as `Hotspot(day, x, y, on_scar=True)` with UTC season days.

### Requirement 5: Snow on each scar

**User Story:** As the Engine, I want a daily snow fraction per scar with clouds and gaps marked missing, so that a cloudy scar never looks snow-free and melt days are not invented.

#### Acceptance Criteria

1. THE Pipeline SHALL read daily snow from GIBS `VIIRS_SNPP_NDSI_Snow_Cover` and cloud from `VIIRS_SNPP_Cloud_Top_Height_Day` for replay seasons, and the `VIIRS_NOAA20_` versions of both for Tonight.
2. THE Pipeline SHALL class each scar pixel on a day as snow (opaque in the snow frame), cloud (not snow, opaque in the cloud frame) or clear (neither).
3. THE Pipeline SHALL set a scar's daily snow fraction to snow ÷ (snow + clear).
4. WHEN more than 50 % of a scar's pixels are cloud, THE Pipeline SHALL treat that day as missing for that scar; WHEN the snow frame has fewer than 2000 opaque pixels region-wide, or either frame cannot be fetched, THE Pipeline SHALL treat that day as missing for every scar.
5. THE Pipeline SHALL give the Engine unrounded fractions and publish the series as 103 whole percents with −1 for missing.

### Requirement 6: Chance baseline

**User Story:** As a judge, I want "chance alone" computed the same way every run, so that the comparison beside the risen count can be checked.

#### Acceptance Criteria

1. THE Pipeline SHALL try, for each grave with a melt day, up to 300 offsets (dx uniform in ±200 px, dy uniform in ±150 px) and accept up to 30 whose shifted polygon lies inside the bbox and does not intersect any year Y−1 scar.
2. THE Pipeline SHALL count an accepted offset as a hit WHEN `find_rise` returns a rise for the cleaned points within 1 km of the shifted polygon, using the grave's own melt day.
3. THE Pipeline SHALL publish `chance` = hits ÷ accepted offsets in [0, 1], using an RNG seeded with the season year.

### Requirement 7: New fires

**User Story:** As a viewer, I want spring fires away from any scar shown as candles, so that ordinary fires are visibly not revenants.

#### Acceptance Criteria

1. THE Pipeline SHALL treat a cleaned spring point (days 0–102) as a new-fire point WHEN it is more than 15 px from every year Y−1 scar.
2. THE Pipeline SHALL cluster new-fire points (rasterised, dilated 3 px, connected components) and publish each as `[x, y, first_day]`, with the mean position and the earliest day.
3. THE Pipeline SHALL publish at most the 24 largest clusters by point count.

### Requirement 8: Publishing seasons

**User Story:** As the UI, I want one validated file with every season's graves, chance and zombie flag, so that I never compute a rule result myself.

#### Acceptance Criteria

1. THE Pipeline SHALL fill each grave row's melt day (−1 for none), rise (`[day, x, y]` or 0) and early hits from `classify_season`, rounding x/y to whole grid pixels only when writing.
2. THE Pipeline SHALL publish per season `chance` and `zombie` = `is_zombie_year(risen, 24, chance)`.
3. THE Pipeline SHALL write `public/data/seasons.json` in the method.md schema plus `chance`, `zombie` and `meta` (generated_at, method, proximity_km, sources, credit naming NASA FIRMS, NASA GIBS/VIIRS, NBAC and Scholten et al. 2021).
4. THE Pipeline SHALL write to a temporary file, run `scripts/validate-data.mjs` on it, and replace the published file only if validation passes.
5. THE Pipeline SHALL update `docs/method.md` to document `chance`, `zombie`, `meta`, the −1 melt value and `tonight.json`.

### Requirement 9: Publishing Tonight

**User Story:** As a duty officer, I want tonight's scars, still-warm heat and the latest clear frame each morning, so that the live view is current and says how current it is.

#### Acceptance Criteria

1. THE Pipeline SHALL publish up to 24 graves `[size_px, cx, cy, last_burn, late_hits_14d, [x, y]|0, snow_pct_now]`: last_burn = latest on-scar date; late_hits_14d = on-scar points in the 14 days ending `today`; [x, y] = latest such point or 0; snow_pct_now = maximum snow % over the last 3 valid days, or −1.
2. THE Pipeline SHALL publish up to 30 last-7-day clusters of cleaned points as `[x, y, point_count]`.
3. THE Pipeline SHALL save the lowest-cloud NOAA-20 true-colour frame of the last 5 days (frames with > 5 % black pixels skipped) as `public/img/viirs-latest.webp`, quality 72.
4. IF no frame qualifies, THEN THE Pipeline SHALL keep the previous frame and `frame_date`.
5. THE Pipeline SHALL publish `as_of`, `frame_date`, `points_through`, `sources` and `credit` in `public/data/tonight.json`, with `today` taken from the command line or the UTC clock in `__main__.py` only.

### Requirement 10: Data contract

**User Story:** As the team, I want a schema check on every published file, so that the UI never renders a broken season.

#### Acceptance Criteria

1. THE validator `scripts/validate-data.mjs` SHALL check both files' shapes and these invariants:
   - grid x in [0, 1059] and y in [0, 715];
   - days in [0, 102] and melt ≤ rise day ≤ melt + 50;
   - 103 snow values in [−1, 100];
   - chance in [0, 1];
   - `zombie` == (risen ÷ 24 > 1.4 × chance);
   - at most 24 graves, 24 new fires and 30 clusters;
   - valid ISO dates;
   - a credit string present.
2. THE validator SHALL exit 0 when every check passes and 1 otherwise, printing each failure with its JSON path.
3. THE validator SHALL use Node built-ins only.
4. WHEN the validator exists and passes its tests, THE team SHALL enable the `data-contract` hook (PostFileSave on `public/data/*.json`).

### Requirement 11: Nightly job

**User Story:** As the team, I want Tonight refreshed every night without anyone at a keyboard, so that the live view stays live through judging.

#### Acceptance Criteria

1. THE workflow `.github/workflows/nightly.yml` SHALL run `python -m pipeline tonight` daily at 10:00 UTC and on manual dispatch, with `FIRMS_MAP_KEY` from repository secrets.
2. THE workflow SHALL cache `pipeline/cache/` between runs.
3. WHEN the run succeeds and outputs changed, THE workflow SHALL commit only `public/data/tonight.json` and `public/img/viirs-latest.webp`.
4. IF the run fails, THEN THE workflow SHALL commit nothing and fail visibly.
5. THE workflow SHALL use least-privilege permissions (`contents: write` only).

### Requirement 12: Honest comparison with the research

**User Story:** As a judge, I want to see how the FIRMS/NBAC results differ from the imagery-based research, so that the claims are not cherry-picked.

#### Acceptance Criteria

1. THE command `python -m pipeline compare` SHALL write `docs/pipeline-vs-research.md` with, per season, risen count, chance and zombie flag from both `public/data/seasons.json` and `data/seasons.json`.
2. THE report SHALL match graves between the two by mask overlap (largest intersection over union), and list matched pairs with both melt days and rise days, plus unmatched graves on each side.
3. THE report SHALL state the number of points dropped by each cleaning step (confidence, `type`, static, bbox) per season.
4. THE report SHALL state the method differences (points vs ~4 km rendered dots, NBAC vs detection footprints, 1 km vs ~3 px) and SHALL NOT describe a difference as an improvement without evidence.
5. THE report SHALL read `data/seasons.json` without modifying it.
6. THE report SHALL list every grave whose melt day changes when the cloud mask is turned off (the research method), with both melt days and whether its Risen result changes.
