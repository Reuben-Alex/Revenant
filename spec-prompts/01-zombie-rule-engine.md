# Spec prompt — zombie-rule-engine (Requirements-first → Analyze Requirements → Correctness/PBT)
Create a spec for a pure Python 3.12 rule engine in `pipeline/rules/` (no I/O, managed with uv) that classifies burn scars ("graves") for a spring season.
Inputs per grave: id, size, centroid, daily snow-cover fraction series (index 0 = Mar 21, may contain missing values),
hotspot detections (day, x, y, onScar boolean). Outputs per day: state ∈ {Buried, Waking, Risen, LaidToRest}, melt day,
rise day/location, days-since-melt; and per season: risen count, chance baseline passthrough, zombie-year flag.
Rules from #[[file:docs/method.md]]: melt = first valid day starting a 7-day window with ≥3 valid observations all < 15%;
Risen = first on-scar hotspot on a day in [melt, melt+50]; hotspots before melt never cause Risen; after melt+50 with no rise = LaidToRest;
a grave that never melts stays Buried; zombie year = risen/24 > 1.4 × chance.
Write EARS requirements. Then run Analyze Requirements. In design, list correctness properties for property-based tests (Hypothesis), e.g.:
state sequence is monotonic; a grave never Rises before melt; Risen implies a hotspot in the window; removing all hotspots yields zero Risen;
shifting all dates by k shifts melt and rise by k.
Tasks must include: scaffolding (`pyproject.toml` with pytest and hypothesis, then set `enabled: true` in `.kiro/hooks/pipeline-tests.json`), the PBT suite, and fixtures from `data/seasons.json`.

Fixture notes (checked against the data):
- `seasons.json` stores each grave's rise point and an early-hit count, not every hotspot. Build each fixture's hotspots from its rise point, marked onScar.
- Expected Risen counts: 2024 = 15, 2025 = 8, 2026 = 4.
- Recomputed melt matches the stored melt on 70 of 72 graves. The stored series is rounded to whole percent, so these two differ: 2024 G-16 (stored 21, recomputed 22) and 2025 G-10 (stored 54, recomputed 59). Neither has a rise, so counts are unaffected. Keep the strict < 15% rule and assert these two as known exceptions; don't loosen the threshold.

Design source: logic only, no UI. `reference/design/Main.dc.html` has the zombie-year threshold at L722 (`N / 24 > RV_CHANCE * 1.4`).
