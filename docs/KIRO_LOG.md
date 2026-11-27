# Kiro log

Feeds the "how Kiro was used" write-up. Newest entries last.
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
## 2026-11-18
- **Spec 05 rising-and-sound done** (Kiro spec, 5 tasks). When the replay reaches a grave's published rise day:
  - the map shakes and flashes, and a sting names the grave, the date and its own days since snowmelt;
  - the camera zooms 2.4× onto the real hotspot, with a letterbox, underglow, fissures, a heave ring, a burning hand and sparks;
  - a boom and crackle play, and a bell tolls once for each grave risen so far, up to 5.

  The first three risings hold the replay for 6 s, and later ones for 3 s. Other sounds: a creak when a grave opens, and the boom and one bell when night falls. 78 Vitest tests pass, including 7 fast-check properties.
- **User decisions:**
  - The replay runs by itself, with no play/pause button. It waits while the viewer opens a grave, the lantern or before/after, or drags the candle.
  - Reduced motion keeps the zoom, as an instant cut instead of a glide.
  - The WCAG 2.2.2 trade-off (no pause control) is noted in the spec, like always-on sound in spec 04.
- **Board error found:** when several graves rose on the same day, the board printed the first grave's day count for all of them. On Spring 2024 day 30 that would say G-24 rose 0 days after its snow left; the published figure is 26. Each grave now carries its own count.
- **Seizure safety:** at 2× speed, Spring 2024 has risings on consecutive days, 325 ms apart. The flash and boom are limited to once a second (WCAG 2.3.1). Property 5 checks this. A browser run at 2× from day 26 measured a shortest gap of 4.8 s, and day 33's rising (400 ms after day 32) updated the text without flashing.
- **Caught by checks:**
  - Planted bugs (the board's shared day count, and a zoom that ignores 2× speed) failed 3 tests.
  - A timer test exposed that a 1× day takes 700 ms, not 650, because of the 100 ms tick. The board has the same rounding, so it was kept and documented.
## 2026-11-20
- **Spec 06 gravekeeper-and-wager done** (Kiro spec, 7 tasks). The graveyard gains a narrator and three of the five puzzles. 103 Vitest tests pass, including 8 fast-check properties for the Gravekeeper's lines, the wager, the riddle, the margin, the hunt and the glitch.
  - **The Gravekeeper** types each line at 26 ms a character, at night arrival, each season's start, the first thaw, the risings, the lantern and the verdict. The live region reads each line once, in full.
  - **Read the stones:** the replay waits at day 0 for a wager. Clue cards show only published values (footprint, latitude, thaw date, early heat). Marked graves carry a candle, and each one that rises grows the lantern by 30 px.
  - **The riddle:** after the first rising, choose the three conditions that made it a revenant. The decoy is fixed by the year. The right answer opens the grave.
  - **Lantern hunt:** new fires hide in the dark until the lantern finds them, by pointer or keyboard, with a counter.
  - **The verdict:** the board's tombstone card, three bells in a zombie year and one in a quiet year, and "Dig them up again". In quiet years (only 2026, from the published flag), whispers come on days 22, 48 and 76 and the map glitches. The glitch is visual only, and off under reduced motion.
- **Honesty:** board lines the data can't back were replaced. "Press play" (there is no play button), "Fewer, and smaller" (every season has 24 graves; the line now compares published areas: 34,600 → 13,500 → 11,600 km²), "after the great fires of 2023" (wrong for 2025), "about as often as chance" (2026 woke at 8 % against 12 %), and the clue "the biggest scars, where the snow leaves first". The 2023 record is cited to NRCan and Jain et al. 2024. Spring 2025 states its thin margin: two fewer risings and it would be chance.
- **User decisions:** the Gravekeeper bets on the three largest graves, so the viewer has a rival, and the thin-margin line was added. All five puzzles are in scope; the last two come with specs 07 and 08.
- **Caught by the checkpoints:**
  - The first-thaw line cut off the 9.5 s night greeting (G-10 thaws on day 1). It now waits for silence and names the latest thaw still in its window.
  - React StrictMode's repeated mount effect replaced the night line with the season intro. The scene now compares against the last scene, and the test renders under StrictMode.
  - At the board's place, the wager panel covered 11 of the 24 Spring 2024 stones. It moved to the right column.
  - The lantern's true-colour image covered the fire marks inside its own light, so the hunt couldn't be won. The lantern now draws the fires it shows.
  - The grave callout sat under the verdict card, and now gives way.
  - With nothing focused, closing the riddle sent focus to the page body. It now goes to the grave's stone.
- **Final pass (task 7):**
  - **Keyboard:** stones mark with Enter or Space. Seal, the riddle cards, Dig, Let it lie and "Dig them up again" are native buttons, 40 px or taller, with a 2 px focus ring. The riddle dialog keeps Tab inside it, and Escape lets it lie.
  - **Contrast:** 20 text pairs on the new panels, measured against each panel's lightest stop, range from 6.6:1 (the wager hint) to 16.9:1.
  - **Reduced motion:** Playwright found no running animation on the wager, riddle, verdict or hunt.
  - **Copy review:** the honesty-review hook runs only on an editor save, so `src/copy/gravekeeper.ts` was reviewed by hand against honesty.md and the voice guide. Every number in it is a template filled from published fields. It has no exclamation marks and no line with more than one break.
## 2026-11-27
- **Spec 07 tonight-live done** (Kiro spec, 9 tasks). Revenant is live at https://revenant-wheat.vercel.app, deployed by GitHub Actions only after `npm run gate` passes (Vercel's own Git deploys are off). The spec 02 nightly job refreshes Tonight at 10:00 UTC, commits the new data, and calls the deploy. Its first cold run hit the FIRMS key's 5,000-per-10-minutes limit, so the job now keeps its cache on failure and waits for the next window.
- **Tests that would have broken the nightly deploy:** several tests had the Nov 20 counts written in ("Nine scars", three warm scars for Keep watch). The first refresh (5 warm) failed them, which would have blocked every nightly deploy. They now read the counts from the published file and scale to nights with fewer warm scars.
- **Review fixes:**
  - The graveyard fits one screen from 1280 × 800 to 2560 × 1440. The side panel is capped at 400 px and the Gravekeeper box at 46 % of the map.
  - The site has share cards (og:/twitter: tags with a 1200 × 630 image), a themed 404, an `/opening` page that scales to fit, and a note on phones pointing to the crew view.
  - A rising's banner now hides the grave callout, the tooltip and the chance chip, and the riddle waits for it to end. Before, a two-grave rising printed its banner straight through the callout.
- **Scare pass (honest by construction):**
  - **Sound:** the boom is panned to the grave's side of the map, and a heartbeat plays under the camera push.
  - **The season's first rising:** the map goes dark and the wind falls silent.
  - **Weather as a readout:** ash falls in proportion to the graves risen, the vignette closes in with each rising, and mist drifts over waking scars. Each has a legend line.
  - **Pointer and idle:** embers lean toward the pointer. When the lantern sits still, the hand comes from a real risen grave, never a made-up one.
  - **The tab:** it reads "They are awake (n)" with the count on screen.
  - **The Gravekeeper:** a shorter, second-person rewrite by the `gravekeeper` agent, plus "You came after dark" on the viewer's own clock.
  - **What was declined:** "Right now. Under the snow." became "were still warm in the last two weeks … crews confirm", because the data can't say "right now".
- **Final pass (task 9):** a Playwright audit of all eight pages checked targets (40 px, 48 on the phone), focus rings, credits, a method link on every data page, AA contrast on solid backgrounds, and that no animation runs under reduced motion. It found 28 px new-fire targets (raised to 40) and missing or too-small method links (added at 40 to 48 px). The opening frame keeps its specified credit line and shows no method link, since it's a video still.
