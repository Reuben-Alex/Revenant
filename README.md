# Revenant

*What burned last summer is not always dead.*

Revenant is an early-warning map for "zombie" wildfires: fires that survive winter underground and re-emerge in spring. It's dressed as a graveyard, and every spooky element is a data rule. Built with [Kiro](https://kiro.dev) for the Kiroween 2026 Costume Contest.

**Status:** in development. Specs live in `.kiro/specs/`, and the run commands below work once the app is scaffolded.

## The rule
A spring hotspot is a **revenant** if it lies within about 1 km of last year's fire scar, and appears after snow leaves that scar and within 50 days of it. Static heat sources such as gas flares are excluded. The method comes from Scholten et al. (Nature, 2021); details are in [docs/method.md](docs/method.md).

## Run it
```
npm install
npm run dev
```

Pipeline and rule tests (Python 3.12, using [uv](https://docs.astral.sh/uv/)):
```
uv run --python 3.12 pytest -q pipeline
```
The live data pipeline needs a free NASA FIRMS key in the `FIRMS_MAP_KEY` environment variable.

## Layout
| Path | Contents |
|---|---|
| `.kiro/` | Specs, steering, hooks, skills, custom agent and MCP settings |
| `pipeline/` | Rule engine and data pipeline |
| `src/` | The app |
| `public/data/`, `public/img/` | Published data and imagery |
| `data/` | Imagery-based research baseline |
| `reference/design/` | Design boards |
| `docs/` | Brief, method, design reference, Kiro plan and log |

## Honest caveats
- The historical results are approximate. They come from rendered imagery, so "on the scar" means about 1–3 km until re-run with FIRMS points.
- 2024 beat the chance baseline, but that is one region and one year, and the chance check is crude. 2025 and 2026 did not beat it, and the app says so.
- Cloud cover means missing data, not "no fire".
- Late-autumn heat can be slash-pile burning, so crews need to confirm it.

## Data and credits
NASA FIRMS, NASA GIBS / VIIRS, NBAC (Canada), and Scholten et al. 2021. See [docs/method.md](docs/method.md).

## Licence
[MIT](LICENSE)
