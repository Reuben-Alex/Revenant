---
inclusion: always
---
# Structure
```
pipeline/rules/   pure rule engine (states, melt, risen, zombie year) — no I/O; the only implementation of the rule
pipeline/         FIRMS/GIBS/NBAC fetch + scars, chance computation, JSON output
src/data/         loaders + types for public/data/*.json; small helper turning day + published melt/rise into a display state
src/scenes/       Daylight, Nightfall, Graveyard, Tonight, Dossier, Phone
src/components/   Tombstone, Callout, Register, CandleTimeline, Gravekeeper, Lantern, Exhumation, Wager
src/motion/       camera, rising, glitch helpers (all reduced-motion aware)
src/audio/        wind, bell, boom, creak, drone
src/copy/         Gravekeeper lines and epitaph templates (see gravekeeper-voice steering)
scripts/          validate-data.mjs (data contract)
public/data/      seasons.json, tonight.json (generated)
public/img/       VIIRS keyframes + scar masks
data/             frozen imagery-based research baseline; never overwritten
reference/design/ design boards (.dc.html) — visual source of truth
spec-prompts/     prompts used to generate .kiro/specs in Kiro
```
