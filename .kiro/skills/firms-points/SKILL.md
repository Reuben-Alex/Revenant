---
name: firms-points
description: Pull VIIRS 375 m fire detections from the NASA FIRMS area API for a date range and classify them against burn scars.
---
# FIRMS points
- API (verify exact path and source names against the FIRMS API docs on day 1): `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{W,S,E,N}/{DAYS}/{YYYY-MM-DD}` with SOURCE in
  `VIIRS_SNPP_SP|VIIRS_NOAA20_SP|VIIRS_NOAA21_NRT` (SP = science-quality archive, NRT = recent). DAYS is 1–10: page through ranges.
- Area for Revenant: `-126,54,-109,60`. Key from env `FIRMS_MAP_KEY`; never log it.
- Drop `type` 2 (static land source) and 3 (offshore). Keep `confidence` n/h.
- Risen test: point within 1 km of the prior-year scar polygon (project to EPSG:3978 or UTM 10/11 before buffering), date in [melt, melt+50].
- Cache raw CSV under `pipeline/cache/` (gitignored).
