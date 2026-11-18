---
inclusion: fileMatch
fileMatchPattern: ["pipeline/**"]
---
# Pipeline rules
Follow #[[file:docs/method.md]] exactly: melt = first day snow < 15% for 7 days (≥3 valid obs); risen = hotspot within 1 km
of the prior-year scar in [melt, melt+50]; drop FIRMS `type` 2 and 3 (SP data only) and recurring points; chance = 30 random offsets per scar.
Write `public/data/seasons.json` in the documented schema; never change the schema without updating `scripts/validate-data.mjs`.
Never commit the FIRMS key; read `FIRMS_MAP_KEY` from the environment.