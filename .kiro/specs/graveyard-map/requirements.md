# Requirements Document

graveyard-map

## Introduction

The night graveyard is the main scene of Revenant and the centre of its Costume Contest entry. The design is `reference/design/Main.dc.html`, with tokens in #[[file:docs/design-reference.md]].

Each burn scar from the year before is a grave. Over a spring replay the graves wake as their snow leaves, rise when heat returns within 50 days, and are laid to rest when it doesn't. Every symbol is a published rule result from `public/data/` (honesty.md). The UI shows those results and never re-implements the rule.

This spec covers the scene's layout and its parts:
- the map stack, tombstones, new-fire candles, callout and tooltip;
- the season tabs, Parish Register, grave cards and legend;
- the candle timeline, lantern, before/after split and exhumation panel;
- a basic Tonight tab.

Daylight and nightfall (04), the rising cinematic and sound (05), narrator, wager and verdict (06), and the Tonight extras, phone and dossier (07) come later.

## Glossary
- **App:** the React app in `src/`.
- **Board:** `reference/design/Main.dc.html`.
- **Season:** Spring 2024, 2025 or 2026 (replay), or Tonight (live).
- **Day:** the replay day, 0–102 from Mar 21.
- **Display state:** buried / waking / risen / laid to rest, from a grave's published melt day and rise.

## Requirements

### Requirement 1: Scaffold and tooling
**User Story:** As the team, I want a standard Vite + React + TypeScript project with checks on save, so that UI work stays green.
#### Acceptance Criteria
1. THE App SHALL be built with Vite, React 19 and TypeScript (strict), using plain CSS with tokens as CSS variables and no UI framework or map library.
2. THE project SHALL provide npm scripts `dev`, `build`, `test` (Vitest, single run), `lint` (ESLint), `typecheck` (`tsc --noEmit`), `check` (lint then typecheck) and `gate` (test then build).
3. THE `ui-checks` hook SHALL run `npm run check --silent` on save of `src/**/*.{ts,tsx,css}`. The `task-gate` hook SHALL run `npm run gate --silent` after each spec task. Single npm scripts avoid `&&`, which this machine's PowerShell 5.1 rejects.
4. THE App SHALL serve `public/` as Vite's public directory, so the data is at `/data/*.json` and the images at `/img/*`.

### Requirement 2: Data
**User Story:** As a judge, I want every number on screen to come from the published files, so that the costume never lies.
#### Acceptance Criteria
1. THE App SHALL load `/data/seasons.json` and `/data/tonight.json` and parse the rows into typed objects, with grave ids `G-01`… in published order.
2. IF a file fails to load or has the wrong shape, THEN THE App SHALL show an error stone naming the file and SHALL NOT render made-up values.
3. THE App SHALL take keyframe file names and days from `src/data/imagery.ts`. That module cites `public/img/README.md` and `reference/design/blob-map.json`. Tonight uses `/img/viirs-latest.webp` and `frame_date`.
4. THE App SHALL derive display state only as: melt < 0 or day < melt → buried; rise and day ≥ rise day → risen; day − melt > 50 → laid to rest; otherwise waking.

### Requirement 3: Page layout and header
**User Story:** As a viewer, I want the board's night page, so that the scene feels like a graveyard rather than a dashboard.
#### Acceptance Criteria
1. THE App SHALL lay out a header, a headline band, the map with the right column, and the footer, using the board's flex rules: the map is `flex: 999 1 560px` with `aspect-ratio: 1060 / 716`, and the aside is `flex: 1 1 340px` with a maximum height of 860 px.
2. THE header SHALL show the tombstone brand icon, "Revenant" (IM Fell English SC 28 px) and the tagline, plus season tabs and iron-plate buttons for Lantern, Before / after and Night view.
3. THE season tabs SHALL be tombstone-shaped (radius 26 26 3 3) with a label and a sub-line: "{N} OF 24 ROSE" for replays, and "LIVE · {points_through}" for Tonight.
4. THE layout SHALL work from 1280 px to 1920 px wide without horizontal scrolling.

### Requirement 4: Map stack
**User Story:** As a viewer, I want the real satellite ground under the graves, so that the spooky layer sits on real data.
#### Acceptance Criteria
1. THE map SHALL stack, in this order:
   - the keyframe images;
   - the night grade (`#04121A`, multiply, 0.45);
   - the season's scar mask (`scars-{Y−1}.png` as a CSS mask, `#B4461A`, 0.42, screen);
   - drifting fog;
   - the 120° W dashed line at x = 374 and the province labels;
   - new fires and tombstones;
   - snowfall;
   - grain and vignette;
   - the callout;
   - hit targets;
   - the tooltip;
   - the overlays (compare, lantern, exhumation).
2. THE keyframes SHALL crossfade by day between neighbouring keyframes, with weights that sum to 1 (board L1078–1088).
3. THE Night view button SHALL switch between the night grade and plain true colour (grade off, scars `#E0561C` at 0.35, no vignette).
4. THE map SHALL show snowfall: `round(30 × (1 − day/40))` flakes until day 40, then none. Tonight shows `round(30 × 1.4)`.
5. THE map SHALL show a credit chip naming NASA GIBS · VIIRS and the shown frame's date, NASA FIRMS for heat, and NBAC for scars.

### Requirement 5: Tombstones
**User Story:** As a viewer, I want each grave's state visible at a glance, so that I can watch the snow leave and the dead rise.
#### Acceptance Criteria
1. THE App SHALL draw each grave at (cx, cy) as the board's tombstone (arch, cross, snow cap). The stroke and fill come from the display state: waking is teal, rest is dim, risen is accent.
2. WHEN a grave is buried, THE App SHALL show its snow cap. The cap fades over the 3 days before melt. Steam and a drip show from melt − 2 to melt + 2.
3. WHEN a grave is waking, THE App SHALL show a breathing teal glow whose opacity grows with days since melt (0.08 + min(since, 50) × 0.003). From day 30 of its window the label reads "RESTLESS".
4. WHEN a grave is risen, THE App SHALL show, at its published rise point:
   - a pulse ring;
   - an ember core;
   - cracks;
   - smoke;
   - a burning hand;
   - embers;
   - a dashed link to the stone when the rise point is more than 30 px away.
5. WHEN a grave is laid to rest, THE App SHALL sink the stone 5 px at 45 % opacity over 1.4 s.
6. THE stones SHALL emerge staggered by 70 ms on first render.

### Requirement 6: New fires
**User Story:** As a viewer, I want ordinary spring fires shown differently, so that I can see they are not revenants.
#### Acceptance Criteria
1. WHEN day ≥ a new fire's first day, THE App SHALL draw it as a candle (a `#F2C14E` triangle with a flickering flame) with a 28 px hit target.
2. WHEN a new fire is selected, THE callout SHALL read "NOT A REVENANT", "New fire F-nn", the first heat date, and "More than 15 km from any {Y−1} scar".

### Requirement 7: Selection, callout and tooltip
**User Story:** As a duty officer, I want to point at a grave and read why it is in its state, so that the symbol explains itself.
#### Acceptance Criteria
1. THE App SHALL give every grave a 40 px round hit button. Clicking it selects the grave and opens its exhumation panel, and hovering shows the tooltip.
2. THE callout SHALL show the selected grave's status, "Grave G-nn", two lines (the board's per-state text) and its coordinates. It is drawn as a tombstone-topped card with a dashed leader.
3. THE callout box SHALL be clamped inside the map (8 px margin), on the side away from the map's right third.
4. THE tooltip SHALL show "G-nn · {state}", "Footprint ~{km} km² · {lat}°N · burned {Y−1}", and "Click to exhume".
5. THE callout SHALL be hidden while the exhumation panel or the lantern is open.

### Requirement 8: Headline and counts
**User Story:** As a viewer, I want a one-line verdict of the moment, so that the story reads at a glance.
#### Acceptance Criteria
1. THE headline band SHALL show counts for Buried, Waking, Risen and Laid to rest that sum to the number of graves.
2. THE headline SHALL be "{Number word} has/have risen." when any grave has risen, "They are waking." when some are waking, and otherwise "They are asleep.", with the board's sublines. Number words cover 0–24.
3. THE headline SHALL glow in the accent colour when any grave has risen.

### Requirement 9: Parish Register
**User Story:** As a judge, I want the observed count beside chance for every season, so that I can see which springs beat chance.
#### Acceptance Criteria
1. THE Register SHALL show one row per replay season: the year, a red-ink bar of risen/24, a dashed faint bar of chance, and "{N} rose · {round(chance × 24)} by chance".
2. THE observed bar SHALL use the strong red (`#C2472C`) when the season's published `zombie` flag is true, and `#8E3A26` otherwise.
3. THE footnote SHALL name the zombie seasons from the published flags, or say that no spring beats chance. It SHALL NOT carry a hard-coded claim.
4. Clicking a row SHALL switch to that season.

### Requirement 10: Grave cards
**User Story:** As a crew lead, I want the graves listed in order of concern, so that I know where to look first.
#### Acceptance Criteria
1. THE list SHALL contain every grave, ordered as follows:
   - by state: risen, then waking, then buried, then laid to rest;
   - risen graves by latest rise first;
   - then by days since melt, largest first;
   - then by size, largest first.
2. EACH card SHALL be a carved stone ("Here lies", id, epitaph line, status, day text, window bar). A risen card has the ember underglow, and the selected card has a bone outline.
3. Clicking a card SHALL select the grave and open its exhumation panel.

### Requirement 11: Legend
**User Story:** As a judge, I want every symbol explained as a rule, so that the costume is honest.
#### Acceptance Criteria
1. THE legend "Every symbol is a rule" SHALL list Scar, Buried, Waking, Risen, New fire and Laid to rest, each with its swatch and a rule text consistent with `docs/method.md`.
2. THE legend SHALL show the static note with the published `static` count, plus the cloud caveat.

### Requirement 12: Candle timeline and replay
**User Story:** As a viewer, I want to play the spring like a burning candle, so that time feels like it is running out.

> **Amended by spec 05 (user decision, 2026-11-18):** there is no play/pause button. The replay runs by itself and waits while a grave, the lantern or before/after is open. See `rising-and-sound` Requirement 9, which supersedes criteria 1 and 2 below where they differ.

#### Acceptance Criteria
1. THE footer SHALL show a 50 px play/pause button, ½× 1× 2× speed buttons, the date ("{Mon d}, {Y}") and a sub-label for the state of play.
2. WHILE playing, THE day SHALL advance by 1 every 1300 / 650 / 325 ms for ½× / 1× / 2×, stopping at day 102. Pressing play at day 102 restarts from day 0.
3. THE timeline SHALL draw the wax from the playhead to the end and the melted stub before it, with the flame and glow at the playhead.
4. THE timeline SHALL show a full red drip for each grave whose rise day ≤ day, and a faint tick for later risings. It SHALL show the selected grave's 50-day window band with "G-nn stirs {date}" and "window ends {date}".
5. Dragging or using the arrow keys on the timeline SHALL scrub the day (an accessible range input labelled "Replay day").
6. THE clock SHALL expose `onRiseCrossed(from, to)` for spec 05.

### Requirement 13: Lantern
**User Story:** As a viewer, I want to hold a lantern over the dark ground, so that I can read the stones like a gravekeeper.
#### Acceptance Criteria
1. WHEN the lantern is on, THE map SHALL be veiled in near-black, except for a circle of radius 130 around the cursor. The circle shows warm true colour and a lantern icon.
2. THE lantern SHALL show the names and states of up to 5 graves within the radius.
3. WHEN a grave hit button has keyboard focus while the lantern is on, THE lantern SHALL move to that grave.
4. Turning the lantern on SHALL close compare and exhumation.

### Requirement 14: Before / after
**User Story:** As a viewer, I want to compare March and June ground, so that I can see the snow leave.
#### Acceptance Criteria
1. WHEN compare is on (replay seasons only), THE map SHALL show the last keyframe, with the first keyframe clipped to the left of a draggable divider (2–98 %). The divider is labelled "◀ {first} {Y}" and "{last} {Y} ▶".
2. THE divider SHALL be an accessible range input labelled "Before and after divider".
3. Compare SHALL be disabled on Tonight.

### Requirement 15: Exhumation panel
**User Story:** As a judge, I want to dig up one grave and see the evidence, so that I can check the rule myself.
#### Acceptance Criteria
1. THE panel SHALL slide in from the right as a tombstone-topped sheet showing:
   - "Here lies", the id and the status;
   - a 40 px close button;
   - the epitaph built from published values.
2. THE panel SHALL show 3 satellite crops at 2.6× around the rise point (or the centroid), with a dashed marker that turns accent on crops dated on or after the rise.
3. THE panel SHALL draw the snow-on-scar curve from the published series, skipping missing days. It also draws the 15 % line, the melt line, the 50-day band and a rise marker.
4. THE panel SHALL list 3 rule checks: burned in {Y−1} (NBAC), snow left on {melt} or still buried, and heat returned {n} days later, watching, or none within 50 days. Each check gets ✓, … or ✕. The proximity is taken from `meta.proximity_km`.
5. Escape and the close button SHALL close the panel and return focus to the grave that opened it.

### Requirement 16: Tonight tab (basic)
**User Story:** As a duty officer, I want the current scars on the same map, so that the live view feels like part of the graveyard.
#### Acceptance Criteria
1. THE Tonight tab SHALL show the latest frame and `scars-2026.png`. Its scars are drawn as tombstones: buried when `snow_pct_now ≥ 50`, settling when ≥ 15, otherwise open. Scars with late heat show "STILL WARM" in `#E8A07A`, and the last-7-day clusters show as candle glows.
2. THE list SHALL be the 2027 watch list, ranked by 0.45 × size/max size + 0.55 × late hits/max late hits, using the maxima of the published file.
3. Callouts, epitaphs and rule checks for Tonight SHALL say that late-autumn heat may be slash-pile burning and that crews confirm.
4. Countdown, staleness, the crew phone view and the dossier are out of scope (spec 07).

### Requirement 17: Accessibility
**User Story:** As a crew member using a keyboard, I want to reach every control, so that the costume doesn't lock me out.
#### Acceptance Criteria
1. EVERY control SHALL be a native button or input with a target of at least 40 px (new-fire targets are 28 px, as on the board), a visible `focus-visible` outline (2 px `#ECE6D6`), and an accessible name.
2. Toggle buttons and tabs SHALL expose `aria-pressed`. The callout and live text SHALL use `role="status"`.
3. Decorative SVG SHALL be `aria-hidden`. The exhumation chart SHALL have a text alternative.
4. Text contrast SHALL meet WCAG AA for body text on its background.

### Requirement 18: Reduced motion
**User Story:** As a viewer who gets motion-sick, I want a still graveyard that shows the same information.
#### Acceptance Criteria
1. WHEN `prefers-reduced-motion: reduce` is set, THE App SHALL apply the board's rule set:
   - no looping animation (pulse, breathe, ember, smoke, hand, flicker, snow, fog, candle, thaw, drip);
   - one-shot animations (emerge, slide, appear, line, tick) shown in their final state;
   - no stone-sink transition.
2. Under reduced motion, every state SHALL still be distinguishable by shape and colour alone.

### Requirement 19: Honest copy
**User Story:** As the team, I want all scene text in one reviewed place, so that no screen states an unsupported claim.
#### Acceptance Criteria
1. ALL visible strings SHALL live in `src/copy/graveyard.ts`. Their templates take only published fields.
2. THE copy SHALL replace the board's research-only claims (see design.md, "Board-to-app decisions").
3. THE map and legend SHALL credit NASA FIRMS, NASA GIBS/VIIRS and NBAC, and the footer SHALL credit Scholten et al. 2021.

### Requirement 20: Fidelity check
**User Story:** As the designer, I want to see each part next to the board before the next part is built, so that the result matches what I envisioned.
#### Acceptance Criteria
1. AFTER each visible part is built, THE team SHALL run `npm run dev` and give the user the local link.
2. A Playwright screenshot at 1440 × 1000 SHALL be checked against the board's markup values: sizes, colours, radii and fonts. Differences over 4 px SHALL be fixed, or reported to the user.
