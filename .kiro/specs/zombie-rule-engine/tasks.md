# Implementation Plan — zombie-rule-engine

## Overview

Builds the pure Python rule engine in `pipeline/rules/` that decides each burn scar's melt day, rise, daily state and
season summary, as specified in `requirements.md` and `design.md`. Tasks run in order from scaffolding to the final
purity check. Each test task is written before the code it covers is considered done.

## Tasks

- [x] 1. Scaffold the Python project and turn on the pipeline-tests hook
  - Create `pyproject.toml` at the repo root: `requires-python = ">=3.12,<3.13"`, no runtime dependencies yet, `[dependency-groups] dev = ["pytest", "hypothesis"]`, `[tool.pytest.ini_options] pythonpath = ["."]`, `testpaths = ["pipeline"]`
  - Create `pipeline/__init__.py`, `pipeline/rules/__init__.py`, `pipeline/tests/__init__.py`, `pipeline/tests/rules/__init__.py`
  - Run `uv lock` and commit `uv.lock`; confirm `uv run --python 3.12 pytest -q pipeline` exits 0 (with a placeholder test if needed, removed in task 2)
  - Move `revenant-kit/kiro-drafts/.kiro/hooks/pipeline-tests.json` into `.kiro/hooks/` with the createHook tool (command `uv run --python 3.12 pytest -q pipeline`, matcher `pipeline/.*\.py$`)
  - _Requirements: 1.9, 6.4_

- [x] 2. Types, constants and validation
- [x] 2.1 Write `pipeline/rules/constants.py` and `pipeline/rules/types.py`
  - Constants `SNOW_FREE_BELOW = 0.15`, `MELT_WINDOW_DAYS = 7`, `MIN_VALID_OBS = 3`, `RISE_WINDOW_DAYS = 50`, `ZOMBIE_FACTOR = 1.4`, each with a comment citing `docs/method.md`
  - `State` enum (values `buried`, `waking`, `risen`, `rest`) and frozen dataclasses `Hotspot`, `GraveInput`, `Rise`, `GraveResult`, `SeasonResult`
  - _Requirements: 1.1, 1.2, 1.3_
- [x] 2.2 Write `pipeline/rules/validate.py`
  - Raise `ValueError` naming grave id and day for NaN/inf/out-of-range snow, series length mismatch, hotspot day out of range, bad chance, duplicate ids, empty season
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 5.4_
- [x] 2.3 Write `pipeline/tests/rules/test_validate.py` with one failing-input example per check
  - _Requirements: 1.4–1.8, 5.4_
- [x] 2.4 Add type checks to `validate.py` with one failing-input example each in `test_validate.py`
  - Hotspot day must be `int` (not `bool`); snow values must be `None` or a real number (not `bool`); hotspot x/y must be finite real numbers; season length must be an `int` ≥ 1
  - _Requirements: 1.10, 1.11, 1.12, 1.13_
- [x] 2.5 Add type checks for `on_scar` (must be `bool`) and the chance baseline (real number, not `bool`), with one failing-input example each
  - _Requirements: 1.14, 1.15_

- [x] 3. Melt day
- [x] 3.1 Implement `melt_day()` in `pipeline/rules/melt.py` (valid snow-free start day; window d…d+6 cut at series end; ≥ 3 valid; all valid < 0.15)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
- [x] 3.2 Write `test_melt.py` examples: exactly 0.15 is snow; 2 vs 3 valid days; missing start day skipped; window cut at series end; all-missing → None; snowy day inside window blocks it
  - _Requirements: 2.1–2.5_

- [x] 4. Rising
- [x] 4.1 Implement `find_rise()` and `early_hits()` in `pipeline/rules/risen.py` (window melt…min(melt+50, n−1); `on_scar` only; location = `math.fsum` mean of that day's hits)
  - _Requirements: 3.1–3.6, 3.8_
- [x] 4.2 Write `test_risen.py` examples: rise on melt day; at melt+50 rises, at melt+51 does not; pre-melt hit ignored but counted as early hit; off-scar hit ignored; two hits on rise day averaged; melt None → no rise
  - _Requirements: 3.1–3.8_

- [x] 5. States and season summary
- [x] 5.1 Implement `state_on()` and the per-day timeline in `pipeline/rules/states.py`
  - _Requirements: 4.1–4.7_
- [x] 5.2 Implement `classify_grave()`, `classify_season()` and `is_zombie_year()` in `pipeline/rules/season.py`; re-export the public API from `pipeline/rules/__init__.py`
  - _Requirements: 5.1–5.5, 1.9_
- [x] 5.3 Write `test_states.py` and `test_season.py` examples: Buried → Risen on melt day; window open at series end stays Waking; LaidToRest from melt+51; never-melting grave Buried all season; zombie threshold just above and just below 1.4 × chance
  - _Requirements: 4.1–4.7, 5.1–5.5_

- [x] 6. Property-based test suite (Hypothesis)
- [x] 6.1 Write `pipeline/tests/rules/strategies.py` and Hypothesis profiles in `conftest.py`
  - Season lengths 1–120; snow values from `None`, boundary values 0.149/0.15/0.151 and `floats(0, 1)`; hotspots across the season, on and off scar; `dev` profile 200 examples, `ci` profile 1000, chosen by `HYPOTHESIS_PROFILE`
  - _Requirements: 1.1–1.3_
- [x] 6.2 Write property tests for monotonic states, no rise before melt, and Risen implies a window hotspot
  - **Property 1: States are monotonic** · **Property 2: Never rises before melt** · **Property 3: Risen implies a hotspot in the window**
  - **Validates: Requirements 3.1, 3.3, 3.4, 4.1–4.4**
- [x] 6.3 Write property tests for no-hotspots and time shift
  - **Property 4: No hotspots, no risings** · **Property 5: Time shift**
  - **Validates: Requirements 2.1, 2.5, 3.1, 3.5, 5.1**
- [x] 6.4 Write property tests for melt correctness against a brute-force oracle, strict threshold and missing data
  - **Property 6: Melt day is the first qualifying day** · **Property 7: Threshold is strict** · **Property 8: Missing data never creates a melt**
  - **Validates: Requirements 2.1–2.5**
- [x] 6.5 Write property tests for hotspot order, inert hotspots and laid-to-rest timing
  - **Property 9: Hotspot order does not matter** · **Property 10: Out-of-window and off-scar hotspots are inert** · **Property 11: Laid to rest only after the window closes**
  - **Validates: Requirements 3.3–3.8, 4.3, 4.6**
- [x] 6.6 Write property tests for the season summary, zombie-flag monotonicity and purity of results
  - **Property 12: Season summary agrees with graves** · **Property 13: Zombie flag is monotone in risings and chance** · **Property 14: Inputs are not mutated, results are deterministic**
  - **Validates: Requirements 1.9, 4.5, 4.7, 5.1–5.3, 5.5**

- [ ] 7. Research fixtures from `data/seasons.json`
- [ ] 7.1 Write the read-only fixture loader in `conftest.py` (percent → fraction, −1 → None, `G-` ids, stored rise point as the only hotspot, chance 0.347 / 0.365 / 0.201 cited to `docs/method.md`)
  - Do not fabricate hotspot dates for `early_hits`; the data stores only a count
  - _Requirements: 6.4_
- [ ] 7.2 Write `test_research_fixtures.py`
  - Risen counts 15 (2024), 8 (2025), 4 (2026); stored rise day and point reproduced for every risen grave
  - Stored melt reproduced for 70 of 72 graves; assert the two known exceptions exactly: 2024 G-16 21→22, 2025 G-10 54→59 (rounded series); do not loosen the 0.15 threshold
  - Zombie flags: 2024 true, 2025 false, 2026 false
  - Assert `data/seasons.json` file hash is unchanged after the run
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 8. Purity check and final run
- [ ] 8.1 Write `test_purity.py`: AST scan of `pipeline/rules/*.py` fails on imports of `os`, `io`, `pathlib`, `json`, `socket`, `requests`, `urllib`, `time`, `datetime`, `random`
  - _Requirements: 1.9_
- [ ] 8.2 Run `uv run --python 3.12 pytest -q pipeline` with `HYPOTHESIS_PROFILE=ci`; all green. Add a 3-line entry to `docs/KIRO_LOG.md` (spec 01 done, which properties caught bugs, if any)
  - _Requirements: 6.1–6.3_

## Task Dependency Graph

```
1 → 2 → 3 ─┐
          ├→ 5 → 6 → 7 → 8
      2 → 4 ─┘
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4"] },
    { "wave": 4, "tasks": ["5"] },
    { "wave": 5, "tasks": ["6"] },
    { "wave": 6, "tasks": ["7"] },
    { "wave": 7, "tasks": ["8"] }
  ]
}
```

- Task 1 must finish first: it creates the Python project that every later task runs in.
- Tasks 3 (melt) and 4 (rising) can run in parallel after task 2, because each uses only the types and validation from task 2.
- Task 5 needs both 3 and 4, since it classifies graves with melt and rise.
- Tasks 6 (property tests) and 7 (research fixtures) come after task 5. Task 8 comes last.
- Within a task, sub-tasks run in the order listed.

## Notes

- The decisions in the "Requirements analysis" table of `design.md` are fixed. Change one only by editing `design.md` first, then the affected tasks.
- Hypothesis runs 200 examples in the `dev` profile and 1000 in `ci`, selected with `HYPOTHESIS_PROFILE`.
- The `pipeline-tests` hook is enabled in task 1. Until then, run `uv run --python 3.12 pytest -q pipeline` by hand.
- The spec's "Analyze Requirements" step was not run through Kiro's own button. Its findings are in `design.md`.
