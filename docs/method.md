# Method, data and results

Two runs are described here.
- **Build (published).** `public/data/seasons.json`, made by `pipeline/` from NASA FIRMS points and NBAC polygons. Everything the app shows comes from it.
- **Research (frozen baseline).** `data/seasons.json`, made from rendered GIBS imagery before the build existed. It is kept unchanged so the two can be compared.

## Region and grid
- Bounding box: lat 54–60 N, lon −126 to −109 (NE British Columbia + N Alberta). BC/AB border = 120° W (x = 374 on the 1060-px grid).
- Design grid: 1060 × 716 px, EPSG:4326. x → lon = −126 + x/1060·17 ; y → lat = 60 − y/716·6. ≈ 1 km/px.
- Season day 0 = Mar 21 (UTC); a spring is days 0–102 (to Jul 1).

## Data sources
| Need | Research (frozen) | Build (published) |
|---|---|---|
| Fire detections | NASA GIBS WMS `VIIRS_SNPP_Thermal_Anomalies_375m_All` + `VIIRS_NOAA20_…` (rendered dots ≈ 4 km) | **NASA FIRMS area API**, VIIRS 375 m points from S-NPP, NOAA-20 and NOAA-21, standard processing (SP) for the springs; near-real-time (NRT) for Tonight |
| Prior-year scars | Union of May–Oct detections, dilated 2 px, connected components, top 24 | **NBAC** burned-area polygons (NRCan CWFIS, release 20260513) for fire years 2023–2025; detection hulls (research method) for the current year, which NBAC has not released |
| Snow | GIBS `VIIRS_SNPP_NDSI_Snow_Cover` daily, fraction of scar pixels with snow | Same layer, with a cloud mask (below); NOAA-20 for Tonight because S-NPP stopped delivering after 2026-11-02 |
| Imagery | GIBS `VIIRS_SNPP_CorrectedReflectance_TrueColor` (keyframes picked by a cloud score) | Same |
| Ground truth | — | Alberta Wildfire "carry-over fire" records; Barber et al. 2026 list (not yet used) |

## Rule (shared)
The rule is implemented once, in `pipeline/rules/` (Python, property-tested). The UI only displays its published results.
- **Melt day** for a scar = first valid day starting a 7-day window with ≥ 3 valid observations, all with snow fraction < 15%. Missing days neither count nor break the window. A grave with no such day never melts (published as −1) and stays Buried.
- **Risen** = first on-scar detection on a day in [melt, melt + 50].
- **Laid to rest** = no rise by melt + 50. If the data ends while the window is still open, the grave stays Waking.
- **Zombie year** = risen / 24 > 1.4 × chance. Otherwise the year is quiet.

## Build method (`pipeline/`)
- **Points:**
  - FIRMS rows are de-duplicated by (lat, lon, date, time).
  - Kept: confidence `n` or `h`.
  - Dropped: SP `type` 2 (static land source) and 3 (offshore).
  - Live points have no `type`. They are dropped when their 375 m cell has detections in ≥ 3 of the last 4 calendar years.
- **On the scar:** within 1000 m of the NBAC polygon, in EPSG:3978 metres. EPSG:3978 shrinks distances here by 1.6–2.8 %, so this is 1017–1029 m on the ground. Say "≈ 1 km".
- **Graves:** the 24 largest scars of year Y−1 inside the bbox, largest first (`G-01`…). Each grave's mask is the grid pixels whose centre is inside the polygon.
- **Snow with a cloud mask:**
  - Each scar pixel is snow (opaque in the NDSI layer), cloud or clear.
  - Cloud means the GIBS `Cloud_Top_Height_Day` layer is opaque **and** the true-colour pixel is bright (mean RGB > 165) or black (swath gap).
  - Snow fraction = snow ÷ (snow + clear).
  - A day is missing for a scar when more than half of it is cloud. It is missing for every scar when the snow frame has < 2000 opaque pixels region-wide, or any frame failed.
- **Chance baseline:**
  - Each grave with a melt day is shifted to random offsets (dx ±200 px, dy ±150 px; up to 300 tries, up to 30 accepted). An offset is accepted when it stays in the bbox and touches no year Y−1 scar.
  - A hit is a rise by the same rule, using the grave's own melt day and points within 1 km of the shifted shape.
  - chance = hits ÷ accepted offsets. The RNG is seeded with the season year, so a re-run gives the same value.
  - If no offset is accepted, the build fails instead of publishing a chance.
- **New fires:** spring points more than 15 px from every year Y−1 scar, clustered by a 3 px dilation. The 24 largest clusters are kept: mean position, first day.
- **Checks:** `scripts/validate-data.mjs` validates every file before it replaces the published one.

## Results
### Build: `public/data/seasons.json` (generated 2026-11-17T10:29:12Z)
| Spring | Scars from | Rose | Chance | 1.4 × chance | Read |
|---|---|---|---|---|---|
| 2024 | NBAC 2023 | **14 / 24 (58%)** | 26.3% | 36.9% | Zombie year |
| 2025 | NBAC 2024 | **9 / 24 (38%)** | 21.5% | 30.1% | Zombie year |
| 2026 | NBAC 2025 | 2 / 24 (8%) | 12.1% | 16.9% | Quiet |

- **Melt days:** every grave has one.
- **Missing snow days per grave** (cloud, or a missing frame; median of 103 days): 41 in 2024, 38 in 2025 and 54 in 2026.
- **Static cells:** 591 cells had a dropped SP `type` 2/3 point across the three springs.
- **2026 is a quiet spring in the data, not a data gap.** Each satellite has about 2,700 spring points, against about 37,000 in 2024.

### Research: `data/seasons.json` (rendered imagery, approximate, frozen)
| Spring | Scars from | Rose | Chance | Read |
|---|---|---|---|---|
| 2024 | 2023 (record season) | 15 / 24 (63%) | 34.7% | Zombie year |
| 2025 | 2024 | 8 / 24 (33%) | 36.5% | No signal |
| 2026 | 2025 | 4 / 24 (17%) | 20.1% | No signal |

The research also had a static filter: pixels in ≥ 3 of 4 annual footprint masks, in components ≤ 120 px, were treated as gas flares (320 found). Tonight in the research (Oct 28, 2026): 24 largest 2026 scars; 13 had heat in the last 14 days.

### What changed, and why
- **2025 moved from "no signal" to a zombie year.** The risen count barely changed (9 against 8). The chance baseline fell from 36.5% to 21.5%.
  - The research counted any rendered heat dot within ~1–3 km of a scar. The build tests real 375 m points against a 1 km distance, so random ground is hit far less often.
  - The 2025 margin is thin: 7 risings (29%) would fall under the 30.1% bar.
- **Cloud handling decides 2025.** The cloud-mask choice was tested in the live runs on 2026-11-17 (spec `data-pipeline`, design.md).
  - With **no cloud mask** (the research method), 2025 is also a zombie year: 8/24 against chance 20.3%.
  - With a **strict mask** (Cloud Top Height alone), 7 of 24 graves never got a melt day and 2025 came out quiet. That mask was rejected because it left graves "under snow" in July for lack of data, not because of snow.
- **2024 is a zombie year under every method tried.**

## Published schema
### `public/data/seasons.json`
```
s2024|s2025|s2026: {
  g: [[size_px, cx, cy, melt_day|-1, [day, x, y]|0, early_hits, "snow% series, 103 values, -1 = missing"], ...≤24],
  f: [[x, y, first_day], ...≤24],          // new fires
  chance: 0–1,                            // hits / accepted offsets
  zombie: true|false                      // risen / graves > 1.4 × chance
}
static: int                               // cells with a dropped SP type 2/3 point, three springs
meta: { generated_at, method, proximity_km, sources: [...], credit }
```
- `rise = [day, x, y]`, where day is the index from Mar 21 of that year (0..102).
- `melt_day = -1` means the grave never melted.
- Positions are whole grid pixels, rounded half up when written.
- Grave ids are `G-` + the 1-based index in each list, sorted by size. Daylight ids are `BA-` + the same index.

### `public/data/tonight.json` (nightly; spec `tonight-live` builds the view)
```
{ g: [[size_px, cx, cy, "last_burn YYYY-MM-DD", late_hits_14d, [x, y]|0, snow_pct_now|-1], ...≤24],
  watch: [i, ...],                         // indices of g, the 2027 watch ranking, best first
  r: [[x, y, point_count], ...≤30],        // last-7-day clusters, flares removed
  static: int,                             // recurring cells removed from NRT points
  as_of, frame_date, points_through, sources: [...], credit }
```

**Watch ranking (`watch`).** It orders Tonight's scars by size and late heat. It is a guide for where to look in spring, not a forecast.
- score = 0.45 × size_px / largest size_px + 0.55 × late_hits_14d / largest late_hits_14d. The late-heat term is 0 when no scar has late heat.
- Ties go to the larger scar, then to the lower index.
- The weights are the design board's, normalised by the night's own maxima instead of the research constants.
- The validator checks that `watch` is a permutation of the grave indices.

### `data/seasons.json` (research, frozen)
This file uses the same `g` and `f` rows without `chance`, `zombie` or `meta`. It also has `t` (Tonight, same rows as `tonight.json` `g` and `r`) and `static: 320`. Its snow series is rounded to whole percent, while its melt days were computed on unrounded fractions. Recomputing melt from the series matches 70 of 72 graves. The exceptions are 2024 G-16 (stored 21, recomputed 22) and 2025 G-10 (stored 54, recomputed 59); neither rose, so Risen counts are unaffected.

## Caveats to state in the writeup
- "On the scar" is ≈ 1 km in the build (~1–3 km in the research).
- Cloud is missing data, not "no snow" and not "no fire". Even with the gentler mask, the median grave is missing 37–52% of its snow days (38–54 of 103).
- The 2025 verdict depends on the cloud method and has a thin margin. Say both.
- This is one region and three springs, and the chance check is a simple offset test. Say so.
- Credit: NASA FIRMS, NASA GIBS/VIIRS, NBAC (NRCan), Scholten et al. 2021.
