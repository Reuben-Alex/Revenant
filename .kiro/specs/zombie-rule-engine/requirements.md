# Requirements Document

zombie-rule-engine

## Introduction

A pure Python 3.12 rule engine in `pipeline/rules/` that classifies last year's burn scars ("graves") through one spring
season. It decides each grave's melt day, whether and where it rose, its display state on every day, and the season's
risen count and zombie-year flag. The engine has no I/O: the pipeline (spec 02) feeds it snow series and hotspots and
publishes its results to `public/data/`. The UI only displays those results and never re-implements the rule (AGENTS.md).

The rule follows #[[file:docs/method.md]] and Scholten et al. (Nature, 2021): a spring hotspot on last year's scar,
after the snow leaves that scar and within 50 days of it, is a revenant.

## Glossary

- **Engine**: the code in `pipeline/rules/`.
- **Grave**: one prior-year burn scar, with an id (`G-01`…), size in px, centroid (x, y) on the 1060×716 grid, and a snow series.
- **Season day**: integer day index; day 0 = March 21 of the season year. The research series has 103 days (0–102).
- **Snow series**: one value per season day, the fraction (0–1) of the grave's pixels under snow, or missing (`None`).
- **Valid day**: a season day whose snow value is not missing.
- **Snow-free value**: a snow value strictly below 0.15.
- **Melt window**: the 7 season days starting at a given day d, i.e. d…d+6, cut off at the end of the series.
- **Melt day**: see Requirement 2.
- **Rise window**: season days melt…melt+50 inclusive.
- **Hotspot**: a fire detection with a season day, grid position (x, y) and an `on_scar` flag. Proximity (1 km for FIRMS points,
  ~3 px for imagery) is decided upstream by the pipeline and arrives as `on_scar`.
- **Chance baseline**: hit rate (0–1) of the same scar shapes moved to 30 random offsets on unburned ground; computed by the pipeline
  and passed through by the Engine.
- **State**: one of Buried, Waking, Risen, LaidToRest.
- **Zombie year**: a season whose risen share beats 1.4 × the chance baseline.

## Requirements

### Requirement 1: Inputs and validation

**User Story:** As the pipeline, I want the Engine to reject malformed input, so that a bad download never becomes a published number.

#### Acceptance Criteria

1. THE Engine SHALL accept, per grave, an id, a size, a centroid (x, y), and a snow series whose entries are a float in [0, 1] or `None`.
2. THE Engine SHALL accept, per grave, zero or more hotspots, each with an integer season day, a position (x, y) and a boolean `on_scar`.
3. THE Engine SHALL accept, per season, a chance baseline in [0, 1] and a season length in days.
4. IF a snow value is NaN, infinite, or outside [0, 1], THEN THE Engine SHALL raise a `ValueError` naming the grave id and day.
5. IF a grave's snow series length differs from the season length, THEN THE Engine SHALL raise a `ValueError`.
6. IF a hotspot's day is outside [0, season length − 1], THEN THE Engine SHALL raise a `ValueError`.
7. IF the chance baseline is outside [0, 1] or NaN, THEN THE Engine SHALL raise a `ValueError`.
8. IF two graves in a season share an id, THEN THE Engine SHALL raise a `ValueError`.
9. THE Engine SHALL NOT read files, the network, the clock or environment variables, and SHALL NOT mutate its inputs.
10. IF a hotspot's day is not an `int` (a `bool`, `float` or `str` does not count), THEN THE Engine SHALL raise a `ValueError` naming the grave id.
11. IF a snow value is neither `None` nor a real number (`int` or `float`, not `bool`), THEN THE Engine SHALL raise a `ValueError` naming the grave id and day.
12. IF a hotspot's x or y is not a finite real number (`int` or `float`, not `bool`), THEN THE Engine SHALL raise a `ValueError` naming the grave id and day.
13. IF the season length is not an `int` of at least 1, THEN THE Engine SHALL raise a `ValueError`.

### Requirement 2: Melt day

**User Story:** As a duty officer, I want each scar's melt day decided by one fixed rule, so that the 50-day watch starts on the same day every time the data is re-run.

#### Acceptance Criteria

1. THE Engine SHALL set a grave's melt day to the first season day d such that d is a valid day, and the melt window starting at d contains at least 3 valid days, and every valid day in that window has a snow-free value.
2. WHEN the melt window starting at d runs past the last season day, THE Engine SHALL evaluate only the days that exist.
3. THE Engine SHALL treat a value of exactly 0.15 as snow, not snow-free.
4. WHEN no season day satisfies criterion 1, THE Engine SHALL report the melt day as `None`.
5. THE Engine SHALL treat missing days as unknown: a missing day SHALL neither count toward the 3 valid days nor break a window.

### Requirement 3: Rising

**User Story:** As a fire crew lead, I want a grave marked Risen only when heat appears on the scar inside its window, so that I am not sent to every spring fire.

#### Acceptance Criteria

1. WHEN a grave has a melt day, THE Engine SHALL set its rise day to the earliest day in the rise window, cut off at the last season day, on which at least one `on_scar` hotspot occurs.
2. THE Engine SHALL set the rise location to the mean x and mean y of all `on_scar` hotspots on the rise day.
3. THE Engine SHALL NOT let a hotspot dated before the melt day cause a rise.
4. THE Engine SHALL NOT let a hotspot dated after melt day + 50 cause a rise.
5. THE Engine SHALL NOT let a hotspot with `on_scar` false cause a rise.
6. WHEN a grave's melt day is `None`, THE Engine SHALL report no rise for it.
7. THE Engine SHALL give the same rise day and location regardless of the order in which hotspots are supplied.
8. THE Engine SHALL report, per grave, the count of `on_scar` hotspots dated before the melt day (early hits), for display only.

### Requirement 4: Daily state

**User Story:** As the graveyard map, I want each grave's state on every day, so that tombstones show Buried, Waking, Risen or Laid to rest without re-deriving the rule.

#### Acceptance Criteria

1. WHEN the melt day is `None` or day d is before the melt day, THE Engine SHALL give state Buried on day d.
2. WHEN the grave has a rise day and d ≥ rise day, THE Engine SHALL give state Risen on day d.
3. WHEN the grave has no rise by day d and d > melt day + 50, THE Engine SHALL give state LaidToRest on day d.
4. OTHERWISE THE Engine SHALL give state Waking on day d.
5. THE Engine SHALL give days-since-melt on day d as d − melt day when d ≥ melt day, and `None` otherwise.
6. WHEN melt day + 50 is past the last season day and the grave has not risen, THE Engine SHALL leave it Waking on the last day (the window is still open when the data ends).
7. THE Engine SHALL provide the state for every season day 0…season length − 1.

### Requirement 5: Season summary

**User Story:** As a judge or duty officer, I want the season's risen count shown beside chance with a fixed zombie-year test, so that a quiet year is called quiet.

#### Acceptance Criteria

1. THE Engine SHALL report the risen count as the number of graves with a rise day.
2. THE Engine SHALL pass the chance baseline through unchanged.
3. THE Engine SHALL set the zombie-year flag to true WHEN risen count ÷ number of graves > 1.4 × chance baseline, and false otherwise.
4. IF a season has zero graves, THEN THE Engine SHALL raise a `ValueError` rather than divide by zero.
5. THE Engine SHALL return graves in the order supplied, so that `G-` ids keep their size-sorted index.

### Requirement 6: Agreement with the research baseline

**User Story:** As the team, I want the Engine to reproduce the published research results, so that the build can be trusted before FIRMS points replace imagery.

#### Acceptance Criteria

1. WHEN run on `data/seasons.json` with each grave's stored rise point as its only hotspot, THE Engine SHALL produce risen counts of 15 (2024), 8 (2025) and 4 (2026).
2. WHEN run on the same data, THE Engine SHALL reproduce the stored melt day for 70 of 72 graves; the two known exceptions are 2024 G-16 (stored 21, Engine 22) and 2025 G-10 (stored 54, Engine 59), caused by the stored series being rounded to whole percent.
3. WHEN run on the same data with chance 0.347, 0.365 and 0.201 (docs/method.md), THE Engine SHALL flag 2024 as a zombie year and 2025 and 2026 as not.
4. THE test suite SHALL read `data/seasons.json` without modifying it.
