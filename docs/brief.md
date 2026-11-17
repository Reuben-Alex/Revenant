# Revenant — product brief

**One line:** a real early-warning map for "zombie" wildfires — fires that survive winter underground and
re-emerge in spring — dressed as a graveyard where every spooky element is a data rule.

**Category:** Costume Contest (haunting UI). **Tagline:** *What burned last summer is not always dead.*

## Why it matters
Overwintering ("holdover", "zombie") fires smoulder in peat and duff under snow and re-ignite in spring,
often weeks before the normal season. Scholten et al. (Nature, 2021) showed they can be detected from
satellites: a new ignition **close to last year's burn scar**, **soon after the snow melts**. Barber et al.
(2026) named an early-warning system as future work. Revenant is that system, with a costume.

## The rule (one sentence)
A spring hotspot is a **revenant** if it lies on (within ~1 km of) last year's fire scar and appears
**after** snow leaves that scar and **within 50 days** of it. Static heat sources (gas flares) are excluded.

## Two realities (the reveal)
1. **Daylight — "Boreal Fire Watch".** A polished, believable, *unremarkable* fire-agency viewer: true-colour
   map, blue markers on 2023 burn areas (BA-01…BA-24), "All clear · 0 active hotspots", real snow % per area,
   search, layers, live badge. A "Night shift" button and a card: *"Night shift starts at 19:00. Some crews keep watch after dark."*
2. **Nightfall.** ~3 s: colour drains, sunset sweeps down, markers sink, low drone. Black title card
   (*"Not every fire goes out in the fall. / Some wait under the snow."*). Then the graveyard: the same 24
   areas rise as tombstones (BA-01 → G-01). The Gravekeeper: *"You were looking at fire scars. Look again."*

## Night screens (see the design boards)
- **Graveyard map** (main). Four seasons: Spring 2024 · 2025 · 2026 · **Tonight (live)**.
  - States per grave: Buried (snow cap) → Waking (teal halo, 50-day window) → **Risen** (hand + embers) → Laid to rest (sinks, fades).
  - New fires (not on a scar) = yellow candle triangles; click → "Not a revenant".
  - **Cinematic rising:** camera zooms 2.4× to the hotspot, letterbox, ember underglow, fissures, ground heave, burning hand, sparks, bell tolls (once per risen grave, max 5).
  - **The Gravekeeper** (narrator): typewriter lines on season start, first thaw, first three risings, verdict; whispers/glitches in quiet years.
  - **Wager:** before replay, mark 3 graves; seal; hits make the lantern grow; verdict scores vs blind expectation.
  - **Lantern mode:** dark veil, cursor lantern reveals true-colour ground and names.
  - **Before/after** split slider (March vs June).
  - **Exhumation panel:** click a stone → epitaph from real data, 3 satellite crops, snow-on-scar curve with 50-day band, rule checklist ticking.
  - **Parish Register:** observed vs chance per season. With the published FIRMS + NBAC data, 2024 and 2025 beat chance and 2026 is quiet (see `docs/method.md`; the 2025 margin is thin and depends on cloud handling).
  - **Candle timeline:** burns down through spring; red wax drips at each rising.
  - **Verdict:** tombstone card; "Dig them up again".
- **Tonight (live):** current-season scars going under snow, last-7-day hotspots, "still warm" scars, 2027 watch list, countdown.
- **Grave dossier** (G-03, Spring 2024): satellite crops, rule checks, and the snow curve with the heat that followed. In the published data, G-03 rose 41 days after its snow left. The "late snowfall" in the dossier board came from the research data.
- **Field crew phone** (390×844): patrol route, nearest risen grave, quick report buttons.
- **Opening frame** (1920×1080) for the video.

## Honesty requirements (non-negotiable — this is our edge over themed-only entries)
- Every symbol maps to a rule; legend says so.
- Quiet years say so ("I do not cry wolf"). The chance comparison stays visible.
- Imagery-rendered proximity is ~1–3 km; the live build must use FIRMS point data for a real 1 km test.
- Late-autumn heat includes slash-pile burning; Tonight says "crews confirm".

## Out of scope for the hackathon
Accounts, push notifications, lightning filtering (Canadian lightning data not open), multi-region.
