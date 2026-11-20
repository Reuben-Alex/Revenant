# Requirements Document

tonight-live

## Introduction

This spec makes **Tonight** a live season, adds the fourth puzzle, **Keep watch**, and builds the three remaining boards:
- the field-crew **phone** view (`reference/design/Phone.dc.html`, 390 × 844);
- the **grave dossier** (`reference/design/Dossier.dc.html`);
- the video's **opening frame** (`reference/design/Opening.dc.html`, 1920 × 1080).

It also puts Revenant on a free static host that stays up through the judging period (to Jan 29, 2027).

The design for Tonight is `reference/design/Main.dc.html`:
- the `isTonight` footer (L484–490);
- the Tonight branches of renderVals(): tabs (L869), states (L893), headline (L1056), counts (L1062), legend (L1232), footer strings (L1378, L1403) and the Tonight exhumation (L1164);
- `setSeason`'s Tonight line (L781).

Tokens and verbatim lines are in #[[file:docs/design-reference.md]].

Tonight already works in the app (spec 03): the published 2026 scars, snow and late heat, the 30 last-7-day clusters, the "2027 watch list", the Tonight callout and exhumation, and "crews confirm" on all late heat. This spec fixes what the board hard-codes, publishes the watch-list ranking, and adds what is missing.

**Board values the data can't back** (each is replaced; design.md, "Board-to-app decisions"):
- The board's fixed dates: "LIVE · OCT 28", "Oct 29, 2026", "Image Oct 26 · heat and snow to Oct 28", "TONIGHT · OCT 28" and "Oct 22–28".
- "April–May 2027 · about 160 nights".
- "First snow is reaching the northeast".
- The research count "Thirteen of them were still warm when the first snow came" (published: nine, in the last 14 days).
- The ranking `score`, which the board and the app compute themselves.
- On the phone: the patrol route, "YOU", "nearest", G-03's "11 days after the snow left. A late snowfall had just melted", and the Alerts and Reports tabs.
- In the dossier, the research G-03:
  - Apr 8 / Apr 19 / 11 days, 57.50°N 121.59°W, "northeast British Columbia", ~10,000 km², the late snowfall, the "southwest edge", the ~3 km band and "320 points";
  - the SENSOR and FIRE POWER columns;
  - "No crew has visited"; full-polygon KML.
- On the opening frame: a credit line without FIRMS and NBAC.

## Glossary
- **Published:** a value in `public/data/seasons.json` or `public/data/tonight.json`, or a field computed by `pipeline/` and validated by `scripts/validate-data.mjs`.
- **Still warm:** a Tonight scar with `late_hits_14d > 0`. Today nine of 24.
- **Watch ranking:** the published order of Tonight's scars by size and late heat (Requirement 2). It is a heuristic for where to look in spring, not a forecast.
- **Stale:** Tonight data whose `as_of` is more than 48 hours before the viewer's clock.
- **Melt spread:** the middle half of all published melt days of the three replay springs (72 graves today): days 24–42, i.e. Apr 14–May 2, with a median of day 31 (Apr 21).
- **Watch lanterns:** the three still-warm scars the viewer picks in Keep watch.

## Requirements

### Requirement 1: Tonight shows its real dates
**User Story:** As a duty officer, I want every date on Tonight to come from the data, so that I know how fresh it is.
#### Acceptance Criteria
1. THE Tonight tab, the footer date, the map credit, the exhumation chart title and the legend's hotspot range SHALL come from `as_of`, `frame_date` and `points_through`. Nothing on Tonight shall be a fixed date.
2. THE footer SHALL replace the board's two hard-coded lines with:
   - "Seen from orbit" over "Image {frame_date} · heat to {points_through} · snow, last 3 days · {credit}";
   - a stamp "Data as of {as_of, UTC date and time}".
3. WHEN Tonight data is stale:
   - the tab sub SHALL read "AS OF {points_through}", not "LIVE";
   - the footer SHALL say "Not updated for {n} days";
   - on entering Tonight the Gravekeeper SHALL say "The satellites have not spoken to me for {n word} days. What you see is from {points_through}."
   Here n is whole days since `as_of`.
4. WHEN `tonight.json` is missing or invalid, THE Tonight tab SHALL stay disabled with "NO LIVE DATA YET" (as today).

### Requirement 2: The watch ranking is published
**User Story:** As a judge, I want the 2027 watch list to come from the pipeline, so that the UI shows results rather than inventing them.
#### Acceptance Criteria
1. THE pipeline SHALL publish `watch` in `tonight.json`: the 0-based indices of `g`, ordered by score, highest first. score = 0.45 × size/max size + 0.55 × late hits/max late hits (0 when no scar has late hits). Ties go to the larger scar, then to the lower index. This is the board's formula, normalised by the night's own maxima instead of the research constants.
2. `scripts/validate-data.mjs` SHALL check that `watch` is a permutation of `0..g.length−1`. `docs/method.md` SHALL document the field and the formula and say it is a heuristic, not a forecast.
3. THE app SHALL order the watch list by `watch` and SHALL NOT compute a ranking itself. Card bars SHALL show rank position, not a score.
4. THE list sub SHALL read "ranked by size and late heat · a guide, not a forecast".

### Requirement 3: When they may wake
**User Story:** As a viewer, I want to know roughly when to look again, without a false prediction.
#### Acceptance Criteria
1. THE footer's "They will wake" SHALL show the melt spread mapped to the next spring: "Apr 14 – May 2, {Y+1}, if the snow keeps the last three springs' pace". Below it: "about {n} nights from {as_of date} to {median date}". The spread comes from the published melt days, so it updates when they do.
2. THE spread SHALL use only graves with a melt day (≥ 0). WHEN fewer than 4 such graves exist, THE footer SHALL say "Not enough springs yet to say."
3. THE Gravekeeper's Tonight line SHALL be: "Tonight I am burying the fires of {Y}. {N word} of them were still warm in the last two weeks.\nI will be watching them in {month of the median}." This replaces the board's research count and "when the first snow came".
4. THE headline sub SHALL replace "First snow is reaching the northeast" with the published count: "{Buried word} already lie under snow."

### Requirement 4: Keep watch (puzzle 4)
**User Story:** As a viewer, I want to choose which still-warm scars to watch next spring, and compare my choice with the ranking.
#### Acceptance Criteria
1. ON Tonight, THE aside SHALL show a "Keep watch" panel, in the wager panel's style: "Set three lanterns on the scars you would watch in spring {Y+1}." Then three slots and "Seal the watch".
2. Pressing a still-warm stone SHALL set or remove a lantern on it, up to three, with a creak. A stone that is not still warm SHALL show "Cold for two weeks: nothing to watch here" on its clue card and SHALL take no lantern. WHEN fewer than three scars are still warm, THE watch SHALL need only that many.
3. WHILE Keep watch is open, hovering or focusing a stone SHALL show a clue card with published values only: footprint ≈ km², late hits in 14 days, last heat date, snow now (or "unseen"). Lanterned stones SHALL show a small lantern mark.
4. "Seal the watch" SHALL compare the lanterns with the first three still-warm scars in `watch` (today G-02, G-16 and G-04). The viewer can only choose still-warm scars, so the ranking is held to the same choice. It shows "{k word} of your three match the ranking's top three still-warm scars ({ids})" and those three. The Gravekeeper says a line from copy, and one bell tolls. Every line SHALL end with "Late heat can be slash-pile burning; crews confirm." No line SHALL say a fire will return.
5. AFTER sealing, "Save the epitaph card" SHALL draw a 1200 × 630 PNG in the browser (canvas) and download it. Nothing is uploaded. The card holds:
   - "Keep watch · spring {Y+1}";
   - the three ids with their late hits and coordinates;
   - "Sealed {as_of date}";
   - the comparison line and the crews-confirm line;
   - the credit, and the site address once hosted.
6. "Watch again" SHALL clear the lanterns. The watch is not stored between visits.
7. EVERY control SHALL be a native button, 40 px or more, keyboard reachable. Stones take lanterns by their existing buttons.

### Requirement 5: The grave dossier
**User Story:** As a crew lead, I want one page per grave that shows why it counts, so that I can brief a crew.
#### Acceptance Criteria
1. THE dossier SHALL be its own page, `dossier.html`. It renders the board's layout for any published replay grave, chosen by the address hash `#{season}/{id}` (e.g. `#s2024/G-03`), with `#s2024/G-03` as the default. Only the hash is read. An unknown hash shows the default with a note.
2. EVERY value SHALL come from the grave's published row:
   - hero kicker "{STATE} · {rise date or melt date}, {Y} · {lat}°N {lon}°W";
   - "Grave {id}";
   - a lede built like the exhumation epitaph, with the real region and year.
3. "What the satellite saw" SHALL show the season's three keyframes cropped at the grave. The ring marks the rise point, or the centroid when the grave did not rise. The credit names the satellite, NASA GIBS and NASA FIRMS.
4. "Why we say it rose" SHALL list the rule's checks from data:
   - on its {Y−1} scar, within ≈ {proximity_km} km (FIRMS points, NBAC scar);
   - snow left {melt}, heat {n} days later, inside 50;
   - static heat filtered ({static} SP static cells across the three springs);
   - lightning not checked, with the board's reason.
   For a grave that did not rise, the second item says what happened instead (never melted, or 50 days passed).
5. "Snow on the scar" SHALL draw the published series with the 15 % line, the 50-day band from the melt day, the melt line and the rise mark. A "late snow" band and label SHALL appear only where the series is ≥ 15 % again after the melt day and before the rise. The caption is built from the same facts.
6. "Life and afterlife" SHALL have four steps from data: Burned (Y−1, km² from NBAC), Buried, Stirred (melt date), and Rose (rise date) or Laid to rest (melt + 50).
7. "Sightings" SHALL list the published rise: date, where, days after melt. The SENSOR and FIRE POWER columns are not published, so they are dropped. In place of "No crew has visited this grave yet." it says "Revenant has no crew reports; crews confirm on the ground."
8. "Export KML" SHALL download a KML file with two placemarks, the scar centroid and the rise point, labelled as points, not the scar's outline. "Send to field crew" opens `phone.html#{season}/{id}`.
9. THE exhumation panel SHALL gain an "Open the dossier" link for replay graves. It opens in a new tab, so the graveyard keeps its place.

### Requirement 6: The field-crew phone
**User Story:** As a crew member, I want the graves near me on my phone, so that I can check them on the ground.
#### Acceptance Criteria
1. THE phone view SHALL be its own page, `phone.html`, laid out like the board at 390 px wide, from 320 to 480 px. It opens on Tonight. A season switch (Tonight, Spring {Y}…) shows the end-of-spring state of a replay.
2. THE kicker and title SHALL be built from data. On Tonight: "{points_through} · NE BC & N ALBERTA", then "{N word} scars were still warm in the last two weeks." On a spring: "{N word} graves rose in spring {Y}."
3. THE map SHALL be the season's frame and scar mask at the 1060 × 716 grid, cropped to fit. It shows the listed graves' stones in their states.
   - A "YOU" dot SHALL appear only after the viewer presses "Use my location", via the browser's Geolocation API.
   - The position stays on the device: it is not sent, stored or logged. Revenant says so next to the button.
   - There is no patrol route.
4. THE card SHALL show the nearest still-warm scar (Tonight) or risen grave (spring) by great-circle distance when the location is known, labelled "NEAREST · {km} km". Otherwise it shows the top of the watch ranking or the latest rise, labelled "TOP OF THE LIST".
   - The card's text comes from data (the callout lines).
   - "Navigate" SHALL open a maps link to the grave's coordinates.
5. "At the grave, what did you see?" SHALL offer Smoke, Ground heat and Nothing as toggles. "Share report" SHALL open the device's share sheet (Web Share API), or copy the text when that is unavailable.
   - The text: grave id, coordinates, date and time, observation, and "Not an official report. Send it to your agency."
   - Revenant stores and sends nothing.
6. THE bottom nav SHALL keep Map and Graves (a list of the season's graves). Alerts and Reports have no data, so they are dropped. Taps are 48 px.
7. `phone.html#{season}/{id}` SHALL open with that grave on the card.

### Requirement 7: The opening frame
**User Story:** As the video editor, I want a clean 1920 × 1080 frame to capture.
#### Acceptance Criteria
1. `opening.html` SHALL render the board at exactly 1920 × 1080:
   - moon, ground, the three rows of stones (23 plus the hero stone), the hero's glow, crack and embers;
   - snow, 70 flakes;
   - the title "Revenant" and "Every winter, some wildfires don't die. They wait under the snow.";
   - "KIROWEEN 2026 · COSTUME CONTEST".
   Geometry and styles follow the board.
2. THE bottom-right credit SHALL read "NASA FIRMS · NASA GIBS/VIIRS · NBAC · REAL 2024–2026 DATA". The board's line omits FIRMS and NBAC (honesty.md).
3. Under reduced motion, snow, embers and glow SHALL hold still.

### Requirement 8: Hosting (user decision: GitHub Actions with Vercel)
**User Story:** As the team, I want a public link that stays up, free, through the judging period.
#### Acceptance Criteria
1. THE site SHALL be built as four pages, `index.html`, `dossier.html`, `phone.html` and `opening.html`, and deployed to **Vercel** by a GitHub Actions workflow on every push to `main`.
   - The workflow runs `npm ci` and `npm run gate`. Only if those pass does it run `vercel pull --yes --environment=production`, `vercel build --prod` and `vercel deploy --prebuilt --prod` (Vercel, "Deploying from an External CI/CD Pipeline").
   - The Vercel CLI reads `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from repository secrets. No token appears in a file, a command line or a log.
2. `vercel.json` SHALL set the Vite build (`dist`), `cleanUrls` (so `/dossier`, `/phone` and `/opening` work), and `git.deploymentEnabled: false`, so that only the workflow deploys, after the checks.
3. THE main page SHALL keep spec 04's rule: no URL parameter or hash skips daylight, nightfall or the title card. The other pages read only their own hash.
4. THE spec 02 nightly workflow (task 11), when built, SHALL publish new data by a commit to `main`, which redeploys. Until then, Tonight shows its staleness (Requirement 1.3).
5. THE user's steps, which the tasks stop and ask for:
   - create the Vercel project (`vercel link`, Hobby plan);
   - make a project-scoped token;
   - add the three secrets to the GitHub repository;
   - push.
   The production address is the project's `*.vercel.app` domain, which the README then links.

### Requirement 9: Honesty, accessibility and checks
**User Story:** As a judge, I want the new pages held to the same standard as the graveyard.
#### Acceptance Criteria
1. EVERY page SHALL credit NASA FIRMS, NASA GIBS/VIIRS, NBAC (where replay scars appear) and Scholten et al. 2021, and link `docs/method.md` on GitHub.
2. EVERY control SHALL be a native button or link, 40 px or more (48 on the phone), with a visible focus ring. Text SHALL meet WCAG AA on its background. All motion SHALL have a reduced-motion fallback.
3. AFTER each visible part, THE team SHALL give the user the link and Playwright screenshots, at the board's size and with the board's state where possible:
   - Tonight at 1440 × 1000 (fresh and stale);
   - Keep watch sealed, and the PNG card;
   - the dossier for 2024 G-03 at 1440 wide;
   - the phone at 390 × 844;
   - the opening at 1920 × 1080.
   Differences over 4 px from the board SHALL be fixed or reported. Differences made for honesty are listed in design.md.
4. `npm run check`, `npm run gate`, `uv run --python 3.12 pytest -q pipeline` and the script tests SHALL pass.
