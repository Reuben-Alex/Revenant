# Kiro log

Feeds the "how Kiro was used" write-up. Newest entries last.

## 2026-11-02
- **Claude Code** set up this repo: `.kiro` steering, hooks, skills and the `gravekeeper` agent; spec prompts; docs aligned with the Official Rules. No specs or app code yet.
- **Claude Code** checked the melt rule against `data/seasons.json`: it reproduces 70 of 72 stored melt days and all Risen counts (15, 8, 4). The other two graves differ because the stored series is rounded; both are noted in spec prompt 01.
- Specs are to be generated in Kiro from `spec-prompts/`.
## 2026-11-11
- **Spec 01 zombie-rule-engine done** (Kiro spec, 8 tasks): pure Python rule engine in `pipeline/rules/`, 108 tests green under `HYPOTHESIS_PROFILE=ci` (Hypothesis, 1000 examples per property). It reproduces the research results: Risen 15/8/4, every stored rise, 70/72 stored melt days (the 2 rounding exceptions asserted), zombie flags 2024 yes / 2025 and 2026 no.
- **PBT:** no property failed on the real code. To check the properties weren't vacuous, 14 rule bugs were planted one at a time and 13 were caught. The 14th (`>` vs `>=` on the start day) changes nothing, because the window check also covers the start day. One gap found this way: random hotspot days missed the window edges, so Property 10 now aims at melt−1 and melt+51.
- **Demo-worthy:** the spec grew Requirements 1.10–1.15 mid-build, so CSV values that were parsed wrongly fail loudly. For example, `on_scar="False"` is truthy in Python and would have faked a Risen grave. `guard-data` and `pipeline-tests` hooks active.
## 2026-11-17
- **Spec 03 graveyard-map done** (Kiro spec, 11 tasks): the night graveyard from `reference/design/Main.dc.html`, rebuilt in React 19 + Vite + TypeScript and wired to `public/data/*.json`. It has four seasons (Spring 2024, 2025, 2026, Tonight), tombstone states, new-fire candles, the Parish Register, grave cards, the candle timeline, the exhumation panel, lantern mode and the before/after slider. 27 Vitest tests pass, including fast-check properties on the derivations.
- **Honesty:** each of the board's research-only claims was replaced with a published value:
  - The Register footnote is built from the `zombie` flags.
  - The static-source count is `seasons.static` (591).
  - "≈ 1 km" comes from `meta.proximity_km`.
  - Scars are credited to NBAC.
  - Tonight's late heat always says "crews confirm".
- **Fidelity loop:** every visible part was screenshotted with Playwright at 1440 × 1000 and checked against the board. This caught graves drifting off their scars when the aside was taller than the map. The map now keeps its own height (`align-self: flex-start`) and the aside scrolls inside it.
- **Final pass (task 11):**
  - **Keyboard:** every control is a native button or input with an accessible name and a 40 px target (new fires are 28 px, as on the board). Escape closes the exhumation panel and returns focus to the grave or card that opened it, and toggles expose `aria-pressed`.
  - **Contrast:** a probe flagged "Here lies" on the grave cards at 3.9:1 against the card's lightest stop, so it was raised to `--ash-3`.
  - **Reduced motion:** Playwright with `reducedMotion: 'reduce'` found no running `rv-*` animation and every one-shot element in its final state.
  - **Overflow:** the screenshots showed the flame glow widening the page by 42 px on Jul 1, so the footer now clips it.
- **Spec 04 daylight-nightfall done** (Kiro spec, 6 tasks). The app opens as "Boreal Fire Watch", a plain agency viewer of Mar 21, 2024. "Night shift" drains the colour for 3.2 s, shows a 6 s title card, then opens the graveyard. 52 Vitest tests pass, including fast-check properties for the daylight numbers and the phase machine.
- **Immersion decision (user):** the opening is one fixed path. Nothing skips it, and sound is always on.
  - There is no sound toggle and no Sound button.
  - Escape and clicks do nothing during nightfall.
  - `?intro=0`, `?season=` and `?day=` work only on the dev server. The production build was served and tested with all three: each opened in daylight. The bundle contains no URL-reading code.
  - The browser tab says "Boreal Fire Watch" until the title card, so it doesn't give away the reveal.
- **Honesty:** the board's daylight claims the data can't back were replaced:
  - "Live · updated 12 min ago" became "Spring 2024 archive".
  - "Active hotspots 0" became "Re-ignited burn areas" (graves with a published rise by day 0).
  - "Fire season has not begun" became "Snow still covers 20 of last year's 24 burn areas".
  - The snow average is the opening-week mean over valid days (80%), instead of the board's 5-day maximum counting missing areas as zero (91%).
  - The title card reads "ignoring 591 static heat sources" (`seasons.static`), not "320 gas flares".
- **Caught by checks:**
  - Planted bugs (the "12 min ago" chip, and an average that counts missing areas as zero) were caught by the property tests.
  - The checkpoint frames showed the night fonts loading only after the reveal, so the title card first appeared in Georgia. The opening now loads them during daylight.
  - The scale bar was 2 px long because of its border width. It now measures exactly 60 km at the map's width.
- **Reduced motion:** nightfall keeps its full timing as a plain fade to black, and the title card holds without animation. Playwright confirmed no filter, sunset or marker sink runs.
