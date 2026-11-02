---
inclusion: fileMatch
fileMatchPattern: ["pipeline/**"]
---
# Pipeline rules
Follow #[[file:docs/method.md]] exactly: melt = first valid day starting a 7-day window with ≥3 valid observations all < 15%; risen = hotspot within 1 km
of the prior-year scar in [melt, melt+50]; drop FIRMS static sources (type ≠ 0) and recurring points; chance = 30 random offsets per scar.
The rule lives only in `pipeline/rules/`, which stays pure (no I/O) and is tested with Hypothesis properties.
Write `public/data/seasons.json` in the documented schema, including each season's `chance`; never change the schema without updating `scripts/validate-data.mjs`.
Never commit the FIRMS key; read `FIRMS_MAP_KEY` from the environment.
