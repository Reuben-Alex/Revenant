---
inclusion: always
---
# Structure
```
src/rules/        pure rule engine (states, melt, risen, chance) — no DOM
src/data/         loaders + types for public/data/*.json
src/scenes/       Daylight, Nightfall, Graveyard, Tonight, Dossier, Phone
src/components/   Tombstone, Callout, Register, CandleTimeline, Gravekeeper, Lantern, Exhumation, Wager
src/motion/       camera, rising, glitch helpers (all reduced-motion aware)
src/audio/        wind, bell, boom, creak, drone
src/copy/         Gravekeeper lines and epitaph templates (see gravekeeper-voice steering)
pipeline/         FIRMS/GIBS/NBAC fetch + scar, melt, risen, chance computation
public/data/      seasons.json, tonight.json (generated)
public/img/       VIIRS keyframes + scar masks
reference/design/ design boards (.dc.html) — visual source of truth
```