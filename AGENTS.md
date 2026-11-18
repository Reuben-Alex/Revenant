# Revenant — shared rules for every agent 

- Revenant is a real zombie-wildfire early-warning map dressed as a graveyard. Read `docs/brief.md` first.
- **Honesty first.** Never invent numbers, dates or places. Every on-screen claim must trace to `public/data/*.json` or a cited source.
  Keep the chance comparison and caveats visible. See `.kiro/steering/honesty.md`.
- Visual truth lives in `reference/design/*.dc.html` and `docs/design-reference.md`. Match them; don't redesign without asking.
  The boards are a spec: write new code in `src/` and never paste board scripts into the app. Use the `design-boards` skill to read them.
- The zombie rule lives in one place, `pipeline/rules/` (Python). The UI displays published results and does not re-implement the rule.
- All motion must have a `prefers-reduced-motion` fallback. All controls keyboard-reachable, 40px+ targets.
- Grid maths: x→lon = −126 + x/1060·17, y→lat = 60 − y/716·6. BC/AB border is 120°W (x = 374).
- Commands: `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `uv run --python 3.12 pytest -q pipeline`.
- Hooks ship with `enabled: false` until the commands they call exist. The scaffold task that creates a command turns on its hook:
  `pipeline-tests` (spec 01), `data-contract` (spec 02), `ui-checks` (spec 03), `task-gate` (once specs 01 and 03 are scaffolded), `visual-snapshot` (once `npm run snap` exists).

