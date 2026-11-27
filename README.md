<p align="center">
  <img src="docs/img/logo.svg" width="112" alt="Revenant logo: a tombstone with a candle flame">
</p>

<h1 align="center">Revenant</h1>

<p align="center">
  <em>What burned last summer is not always dead.</em>
</p>

<p align="center">
  <a href="https://kiroween.devpost.com/"><img alt="Kiroween 2026: Costume Contest" src="https://img.shields.io/badge/Kiroween_2026-Costume_Contest-FF6B2C?style=for-the-badge&labelColor=050807"></a>
  <a href="https://kiro.dev"><img alt="Built with Kiro" src="https://img.shields.io/badge/built_with-Kiro-7FE0CF?style=for-the-badge&labelColor=050807"></a>
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=0A110F">
  <img alt="Vite 8" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&labelColor=0A110F">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white&labelColor=0A110F">
  <img alt="Python 3.12" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white&labelColor=0A110F">
  <img alt="Data: NASA FIRMS, GIBS, NBAC" src="https://img.shields.io/badge/data-NASA_FIRMS_%C2%B7_GIBS_%C2%B7_NBAC-E6D6AE?labelColor=0A110F">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-ECE6D6?labelColor=0A110F"></a>
</p>

<p align="center">
  <a href="#the-rule">The rule</a> ·
  <a href="#what-the-data-says">Results</a> ·
  <a href="#inside-the-graveyard">The graveyard</a> ·
  <a href="#puzzles">Puzzles</a> ·
  <a href="#tonight-live">Tonight</a> ·
  <a href="#out-in-the-field">Field pages</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#how-it-was-built">How it was built</a> ·
  <a href="#honest-caveats">Caveats</a> ·
  <a href="#data-and-credits">Credits</a>
</p>

<p align="center">
  <img src="docs/img/rising.jpg" alt="The graveyard at night: grave G-10 rises on Apr 7, 2024, 16 days after its snow left. A burning hand breaks through the scar while the Gravekeeper narrates." width="100%">
</p>

Some wildfires don't go out in the fall. They smoulder all winter in peat and deep soil under the snow, then flare up again in spring on last year's burn scar, often weeks before the normal fire season. Fire crews call them holdover or overwintering fires. Everyone else calls them **zombie fires**.

**Revenant** is an early-warning map for them across northeast British Columbia and northern Alberta, built on NASA satellite data. It's dressed as a graveyard: every burn scar is a grave, and every spooky thing on screen is a data rule.

> [!NOTE]
> Revenant is an entry in the [Kiroween 2026](https://kiroween.devpost.com/) Costume Contest. The graveyard, all three spring replays, Tonight (live) and the field pages work today; the public site and the nightly refresh are next. See [Status](#status).

## Two realities

The app opens as a plain fire-agency viewer. Press **Night shift** and the colour drains away. The same 24 burn areas come back as tombstones.

<table>
  <tr>
    <td width="50%"><img src="docs/img/daylight.jpg" alt="Boreal Fire Watch: a clean daytime map of 24 monitored burn areas, reporting All clear on Mar 21, 2024."></td>
    <td width="50%"><img src="docs/img/graveyard.jpg" alt="The same map at night on May 6, 2024: ten graves have risen, fourteen are waking."></td>
  </tr>
  <tr>
    <td align="center"><b>Daylight: Boreal Fire Watch</b><br><sub>Spring 2024 archive. "All clear." Snow still covers 20 of last year's 24 burn areas.</sub></td>
    <td align="center"><b>Night: the graveyard</b><br><sub>The same scars 46 days on: ten have risen, fourteen are waking.</sub></td>
  </tr>
</table>

<p align="center">
  <img src="docs/img/title-card.jpg" alt="Title card: same satellites, same data, after dark. Ignoring 591 static heat sources. Not every fire goes out in the fall." width="72%">
</p>

## The rule

> A spring hotspot is a **revenant** if it lies within **≈ 1 km** of last year's burn scar, and appears **after** the snow leaves that scar and **within 50 days** of it. Static heat sources such as gas flares don't count.

This is the detection idea from [Scholten et al., *Nature* 2021](https://www.nature.com/articles/s41586-021-03437-y). The rule is written once, in Python ([`pipeline/rules/`](pipeline/rules)), and property-tested. The app only shows what the pipeline publishes; it never re-decides a grave.

```mermaid
flowchart LR
  F["NASA FIRMS<br/>VIIRS 375 m points"] --> P
  N["NBAC<br/>burn scars, year Y−1"] --> P
  S["NASA GIBS<br/>daily snow + cloud"] --> P
  P["pipeline/<br/>melt day · risen · chance"] --> J[("public/data/<br/>seasons.json<br/>tonight.json")]
  J --> A["The app<br/>React · SVG · WebAudio"]
```

- **Melt day:** the first day of a 7-day window with at least 3 clear views, all under 15 % snow on the scar.
- **Risen:** the first hotspot within ≈ 1 km of the scar between the melt day and 50 days after it.
- **Chance baseline:** every scar shape is moved to random unburned ground, up to 30 times, and the same test runs there. That hit rate is what chance alone would give.
- **Zombie year:** more graves rose than 1.4 × chance.

The full method, with every threshold and source, is in [docs/method.md](docs/method.md).

## What the data says

The 24 largest scars of each fire year, tested the following spring:

| Spring | Scars from | Rose | Chance | Bar (1.4 × chance) | Verdict |
|---|---|---|---|---|---|
| 2024 | NBAC 2023 | **14 / 24** (58 %) | 26.3 % | 36.9 % | 🔥 Zombie year |
| 2025 | NBAC 2024 | **9 / 24** (38 %) | 21.5 % | 30.1 % | 🔥 Zombie year, by a thin margin |
| 2026 | NBAC 2025 | 2 / 24 (8 %) | 12.1 % | 16.9 % | 🕯️ Quiet |

Generated 2026-11-17 from FIRMS points and NBAC polygons. 591 static heat cells were removed.

The 2025 result depends on how cloud is handled: with 7 risings instead of 9 it would fall under the bar. Spring 2026 shows nothing, and the Gravekeeper says so: *"I do not cry wolf."*

## Inside the graveyard

Every symbol on the map is a rule, and the legend says which.

| You see | It means |
|---|---|
| ❄️ A snow cap on the stone | **Buried:** snow still covers the scar |
| 🟢 A teal halo, breathing | **Waking:** the snow has gone and the 50-day window is open |
| 🔥 A burning hand and embers | **Risen:** a hotspot on the scar inside the window |
| 🪦 A stone sunk and faded | **Laid to rest:** the window closed with no heat |
| 🕯️ A yellow candle | **New fire:** more than about 15 km from every scar, so not a revenant |
| 🩸 A red drip on the candle timeline | A rising on that day |
| 📜 Red ink against faint ink in the Parish Register | Graves that rose against what chance would raise |

The replay runs by itself and waits whenever you stop to look. When a grave rises, the camera pushes in 2.4×, the screen letterboxes, the ground splits and a bell tolls. The **Gravekeeper** narrates the season from real dates and counts. Click any stone to **exhume** it: its epitaph comes from its data, with three satellite crops, its snow curve and the rule checked line by line.

<table>
  <tr>
    <td width="50%"><img src="docs/img/exhumation.jpg" alt="Exhumation of G-10: the epitaph, three VIIRS crops, the snow-on-scar curve with the 50-day band, and the rule checklist."></td>
    <td width="50%"><img src="docs/img/wager.jpg" alt="The Gravekeeper's wager: three graves marked, and a clue card for G-05 showing its footprint, latitude, thaw date and early heat."></td>
  </tr>
  <tr>
    <td align="center"><b>Exhumation</b><br><sub>An epitaph from the data: "Here lies some 1,300 km² of northern Alberta…"</sub></td>
    <td align="center"><b>The wager</b><br><sub>Mark three graves before the replay. The clues are published values only.</sub></td>
  </tr>
</table>

When the replay reaches July 1, the Gravekeeper gives his **verdict** on a tombstone card: how many rose, against how many chance alone would raise. In a quiet year he says so, and the map glitches while a voice under the snow whispers *"only spring fires."*

<p align="center">
  <img src="docs/img/verdict.jpg" alt="The verdict of spring 2024: fourteen of 24 rose. The same shapes on unburned ground caught heat 26% of the time, so these scars woke 2.2 times as often as chance. A zombie year." width="100%">
</p>

Turn your sound on. The wind, drone, bell, boom, heartbeat and creak are all made live with WebAudio; there are no audio files. The boom of a rising comes from the grave's side of the map, so you hear it before the camera gets there.

### The dead notice you

The weather is a readout too, and the legend says how:

| You see | It means |
|---|---|
| 🌫️ Mist drifting over a scar | That scar is waking |
| 🔥 Ash falling with the snow | Two flecks for every grave risen |
| 🌑 The edges of the map closing in | It tightens with each rising |

- **The first rising of a season starts in the dark.** The map goes black except for the grave's own glow, then lifts as the hand breaks through.
- **The embers lean toward your pointer.** Hold the lantern still for 20 seconds, and the nearest grave that really rose reaches toward the light from where its heat came back.
- **The tab notices you leave.** Switch tabs mid-replay and it reads *"They are awake (14)"* under a burning hand. On Tonight it reads *"Still warm (n)"*, counting that night's still-warm scars. Every count is the one on screen.
- **The Gravekeeper notices the time.** Arrive after 19:00 by your own clock and he says *"You came after dark. So do they."*
- **The side panel steps back while the replay plays,** so the graveyard runs like a film. A chip on the map keeps the chance comparison in view.

## Puzzles

Five puzzles teach the rule by playing it.

| | Puzzle | What you do | Status |
|---|---|---|---|
| 1 | **Read the stones** | Bet on three graves using size, latitude, thaw date and early heat. Each hit makes your lantern burn brighter. | ✅ Built |
| 2 | **The Gravekeeper's riddle** | After the first rising, pick the three conditions that made it a revenant, and avoid the decoy. | ✅ Built |
| 3 | **Lantern hunt** | The map goes dark. Sweep your lantern over it to find the season's new fires, the ones that aren't revenants. | ✅ Built |
| 4 | **Keep watch** | On Tonight, set three lanterns on this autumn's still-warm scars, seal them against the published watch list, and save your epitaph card. | ✅ Built |
| 5 | **Is it chance?** | Drag a grave's own shape onto unburned ground and see whether that spot caught heat, using the chance test's real offsets. | 📋 Planned |

<table>
  <tr>
    <td width="50%"><img src="docs/img/riddle.jpg" alt="The Gravekeeper's riddle: Why did G-10 rise? Four cards; three are true and one is a decoy."></td>
    <td width="50%"><img src="docs/img/lantern.jpg" alt="Lantern hunt: the map is dark except for the lantern's circle, which shows true-colour ground and a new fire. 1 of 10 new fires found. The Gravekeeper: That one is not mine."></td>
  </tr>
  <tr>
    <td align="center"><b>The riddle</b><br><sub>Three true conditions and one decoy.</sub></td>
    <td align="center"><b>Lantern hunt</b><br><sub>"That one is not mine. F-14 burned more than about 15 km from every scar."</sub></td>
  </tr>
</table>

## Tonight (live)

The fourth tab is this autumn, read from the latest nightly data. The 24 largest scars of 2026 are going under snow, and some of them were still warm when it came.

<p align="center">
  <img src="docs/img/tonight.jpg" alt="Tonight, Nov 19, 2026: they are going to sleep. Nine of 24 scars of 2026 showed heat in the last two weeks; ten already lie under snow. Three lanterns are set on G-24, G-02 and G-16 in the Keep watch panel." width="100%">
</p>

- **Buried, snow settling, still warm:** each scar's state comes from that night's snow cover and its heat over the last 14 days. On the Nov 20 run, 9 of 24 were still warm and 10 already lay under snow.
- **Heat clusters:** the last 7 days of FIRMS points, with recurring industrial sources removed.
- **The 2027 watch list** ranks the scars by size and late heat. It's a guide for where to look in spring, not a forecast.
- **They will wake:** the likely thaw window comes from the 72 melt days already published, not from a guess.
- **Crews confirm:** late-autumn heat can be slash-pile burning, so every still-warm scar says so.
- **Stale data says so.** If the data is more than two days old, the tab reads "AS OF", the footer counts the days and the Gravekeeper mentions it.

## Out in the field

Three more pages, each built from the same published files.

<table>
  <tr>
    <td width="68%"><img src="docs/img/dossier.jpg" alt="The grave dossier for G-03, spring 2024: risen May 26, 2024 at 59.66°N 112.27°W. Here lies some 3,100 km² burned in the summer of 2023, in northern Alberta. Three satellite crops: buried on Mar 25, waking on Apr 18, risen on Jun 18."></td>
    <td width="32%"><img src="docs/img/phone.jpg" alt="The field-crew phone at 390 px: Fourteen graves rose in spring 2024. A cropped map of the risen graves, and the card for G-03, sent from the dossier, with Navigate and Report buttons."></td>
  </tr>
  <tr>
    <td align="center"><b>The grave dossier</b> · <code>/dossier#s2024/G-03</code><br><sub>Any replay grave: three satellite crops, the snow curve, the rule checks and a KML export.</sub></td>
    <td align="center"><b>The field-crew phone</b> · <code>/phone</code><br><sub>Nearest grave and a quick report. Your position stays on the phone.</sub></td>
  </tr>
</table>

- **The dossier** opens from any exhumation panel. *Send to field crew* opens that grave on the phone.
- **The phone** finds the nearest grave only when you press *Use my location*, and the position never leaves the device. *Navigate* opens Google Maps. Reports go through your phone's share sheet, marked "Not an official report".
- **The opening frame** (`/opening`) is a still 1920 × 1080 title card for the demo video.

<p align="center">
  <img src="docs/img/opening.jpg" alt="The opening frame: Revenant. Every winter, some wildfires don't die. They wait under the snow. A moonlit graveyard, with one stone glowing and cracked at its base." width="100%">
</p>

## Quick start

You need [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

```bash
npm install
npm run dev      # http://localhost:5173
```

The app opens in daylight; press **Night shift**. On the dev server only, `?intro=0` skips to the graveyard, and `?season=s2025&day=40` opens a season on a given day. The production build ignores both: there, the night always starts with the reveal.

| Page | Dev server |
|---|---|
| The graveyard | `http://localhost:5173/` |
| A grave dossier | `/dossier.html#s2024/G-03` (any season and grave) |
| The field-crew phone | `/phone.html`, or `/phone.html#s2024/G-03` for one grave |
| The opening frame | `/opening.html` at 1920 × 1080 |

| Command | What it does |
|---|---|
| `npm test` | Vitest and fast-check tests for the UI |
| `npm run check` | ESLint, then the TypeScript check |
| `npm run build` | Production build of all four pages into `dist/` |
| `npm run gate` | Tests, build, then a bundle check that the main page reads no URL |

### The data pipeline

The published data is already in `public/data/`. To rebuild it you need Python 3.12, [uv](https://docs.astral.sh/uv/) and a free [NASA FIRMS map key](https://firms.modaps.eosdis.nasa.gov/api/map_key/) in `FIRMS_MAP_KEY`.

```bash
uv run --python 3.12 pytest -q pipeline           # rule and pipeline tests
uv run --python 3.12 python -m pipeline seasons   # rebuild seasons.json and the scar masks
uv run --python 3.12 python -m pipeline tonight   # rebuild tonight.json and the latest frame
```

Each file is checked by [`scripts/validate-data.mjs`](scripts/validate-data.mjs) before it replaces the published one.

## How it was built

Revenant was built in [Kiro](https://kiro.dev) one spec at a time, and everything Kiro used is in [`.kiro/`](.kiro).

- **Specs** ([`.kiro/specs/`](.kiro/specs)): requirements, design and tasks for each part: rule engine, data pipeline, graveyard map, daylight and nightfall, rising and sound, Gravekeeper and puzzles, and Tonight with the field pages.
- **Steering** ([`.kiro/steering/`](.kiro/steering)): the honesty rules, the costume rules, the Gravekeeper's voice, the pipeline method and the tech stack.
- **Hooks** ([`.kiro/hooks/`](.kiro/hooks)): pipeline tests, a data contract check, an honesty review of copy, UI checks and a task gate.
- **Skills and agents:** design-board reading and porting, FIRMS and GIBS fetchers, and a `gravekeeper` agent that writes only copy.
- **Property-based tests:** Hypothesis for the Python rule engine and fast-check for the UI. To check that the properties weren't vacuous, rule bugs were planted on purpose; the tests caught 13 of 14.
- **Visual checks:** every screen was screenshotted with Playwright and compared with the design boards in [`reference/design/`](reference/design).

The build log is in [docs/KIRO_LOG.md](docs/KIRO_LOG.md).

<details>
<summary><b>Project layout</b></summary>

| Path | Contents |
|---|---|
| `src/data/` | Loaders, types and pure derivations of the published data |
| `src/scenes/` | Daylight, nightfall, the graveyard, the dossier, the phone and the opening frame |
| `src/entries/`, `*.html` | The four Vite pages |
| `src/components/` | Tombstones, Gravekeeper, wager, riddle, lantern, Keep watch, exhumation, register, candle timeline |
| `scripts/` | The data validator and guard, the bundle check and the Kiro log tool |
| `src/audio/` | Wind, drone, bell, boom and creak in WebAudio |
| `src/copy/` | Every line on screen, including the Gravekeeper's |
| `pipeline/` | FIRMS, GIBS and NBAC fetch, and the rule engine in `pipeline/rules/` |
| `public/data/`, `public/img/` | Published data, VIIRS keyframes and scar masks |
| `data/` | The frozen research baseline, from rendered imagery |
| `reference/design/` | The design boards: the visual source of truth |
| `docs/` | Brief, method, design reference and the Kiro log |

</details>

## Status

- [x] Rule engine, with property tests
- [x] Data pipeline: FIRMS points, NBAC scars, cloud-masked snow, chance baseline
- [x] Graveyard map, Parish Register, candle timeline, exhumation, lantern, before/after
- [x] Daylight viewer and the nightfall reveal
- [x] The rising cinematic and sound
- [x] The Gravekeeper's narration, the wager and the riddle
- [x] Lantern hunt, the verdict and quiet-year whispers
- [x] Tonight (live) and Keep watch
- [x] The grave dossier, the field-crew phone and the opening frame
- [ ] Public site on Vercel, deployed by GitHub Actions after the checks pass
- [ ] Nightly data refresh with GitHub Actions
- [ ] Puzzle 5: *Is it chance?*

## Honest caveats

The costume is spooky; the data is not.

- **"On the scar" means ≈ 1 km.** It's measured in EPSG:3978, which shrinks distances here by 1.6–2.8 %.
- **Cloud is missing data,** not "no snow" and not "no fire". Even with the cloud mask, the median grave is missing 38–54 of its 103 snow days.
- **2025 is close.** The verdict depends on the cloud method and has a margin of two graves.
- **Small sample:** one region, three springs, and a simple offset test for chance.
- **Late-autumn heat** can be slash-pile burning, so Tonight always says *crews confirm*. It never says a fire will return.

## Data and credits

- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/): VIIRS 375 m active fire points from S-NPP, NOAA-20 and NOAA-21.
- [NASA GIBS](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api) / VIIRS: true colour, NDSI snow cover and cloud top height.
- [NBAC](https://cwfis.cfs.nrcan.gc.ca/datamart/metadata/nbac), the National Burned Area Composite (Natural Resources Canada, CWFIS): burn scars for 2023–2025, release 20260513.
- Scholten, R. C. et al. (2021). [Overwintering fires in boreal forests](https://www.nature.com/articles/s41586-021-03437-y). *Nature*.
- Jain, P. et al. (2024). [Drivers and impacts of the record-breaking 2023 wildfire season in Canada](https://www.nature.com/articles/s41467-024-51154-7). *Nature Communications* 15, 6764. Cited for the 2023 record in the Gravekeeper's lines.

> We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

Revenant is not an official warning service. For real fire information, follow [BC Wildfire Service](https://www2.gov.bc.ca/gov/content/safety/wildfire-status) and [Alberta Wildfire](https://www.alberta.ca/wildfire-status).

## Licence

[MIT](LICENSE) © 2026 Reuben-Alex
