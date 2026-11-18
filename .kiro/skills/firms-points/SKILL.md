---
name: firms-points
description: Pull VIIRS 375 m fire detections from the NASA FIRMS area API for a date range and classify them against burn scars.
---
# FIRMS points
- API (checked Nov 11, 2026 at https://firms.modaps.eosdis.nasa.gov/api/area/): `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{W,S,E,N}/{DAY_RANGE}/{YYYY-MM-DD}`.
  DAY_RANGE 1–5; returns DATE through DATE+DAY_RANGE−1, so page through a season in 5-day steps.
  SOURCE: `VIIRS_SNPP_SP`, `VIIRS_NOAA20_SP`, `VIIRS_NOAA21_SP` for past seasons (standard processing); `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`,
  `VIIRS_NOAA21_NRT` for the last weeks (Tonight). Check `/api/data_availability/` for the date range each source covers.
  Merge sources and de-duplicate by (lat, lon, acq_date, acq_time).
- Transactions are metered per MAP_KEY: cache every response and never re-fetch a cached range.
- Area for Revenant: `-126,54,-109,60`. Key from env `FIRMS_MAP_KEY`; never log it.
- SP rows carry `type`: drop 2 (static land source) and 3 (offshore). NRT rows have no `type`, so for Tonight drop points that
  recur at the same 375 m cell in ≥3 of the last 4 years (the static filter in docs/method.md). Keep `confidence` n/h.
- Risen test: point within 1 km of the prior-year scar polygon (project to EPSG:3978 or UTM 10/11 before buffering), date in [melt, melt+50].
- Cache raw CSV under `pipeline/cache/` (gitignored).
