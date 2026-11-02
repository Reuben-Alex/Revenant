# Spec prompt — data-pipeline (Design-first)
Design a Python 3.12 pipeline in `pipeline/` that produces `public/data/seasons.json` and `public/data/tonight.json` in the schema in
#[[file:docs/method.md]], using NASA FIRMS VIIRS 375 m points (skill: /firms-points), prior-year scars (NBAC polygons when available,
else dilated detection hulls), daily VIIRS NDSI snow per scar (skill: /gibs-imagery), static-source filtering, and a chance baseline
(30 random offsets per scar on unburned ground). It calls `pipeline/rules/` for melt, rise and zombie-year results and publishes them, so the UI never
re-implements the rule. Include a nightly GitHub Actions workflow with secret FIRMS_MAP_KEY that commits
updated JSON and the latest true-colour frame. Design first: data flow diagram, module boundaries, caching, failure modes (clouds,
API gaps, swath gaps), and a validation script `scripts/validate-data.mjs` (then set `enabled: true` in `.kiro/hooks/data-contract.json`). Then requirements, then tasks. Compare results against
`data/seasons.json` (imagery-based) and report differences honestly.

Design source: the `data/seasons.json` schema, and `reference/gibs-pipeline.js` as the baseline method to compare against (not code to ship).
