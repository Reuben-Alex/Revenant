# Requirements Document

daylight-nightfall

## Introduction

This spec builds the opening reveal of Revenant. The design is `reference/design/Main.dc.html`: the `dayOn` block (daylight viewer), the `intro` block (title card) and `nightfall()` (timing and sound). Tokens and motion are in #[[file:docs/design-reference.md]].

The app opens as **Boreal Fire Watch**, a plain fire-agency viewer showing Mar 21, 2024: blue markers BA-01…BA-24 on the 2023 burn areas, an "All clear" status, and the real snow % on each area. A "Night shift" button starts **nightfall**:
1. For 3.2 s the colour drains, a sunset sweeps down, the markers sink and a low drone plays.
2. A black title card holds for 6 s.
3. The night graveyard of spec 03 opens on Spring 2024, and its tombstones emerge one by one.

The costume lives in the reveal, so the opening is one fixed path for every visit. Nothing skips it, and sound is always on. The numbers stay true: every value on the daylight screen comes from `public/data/seasons.json` (honesty.md).

Out of scope:
- the Gravekeeper's nightfall line, which needs the narrator panel and wager (spec 06);
- the sting and bell at the start of night (spec 05);
- the phone view (spec 07).

## Glossary
- **App:** the React app in `src/`.
- **Board:** `reference/design/Main.dc.html`.
- **Phase:** `day` → `dusk` → `title` → `night`, as in the board's `state.phase`.
- **Burn area:** a grave of Spring 2024 (a 2023 NBAC scar) shown in daylight. `BA-nn` matches `G-nn`.
- **Opening week:** replay days 0–6 of Spring 2024 (Mar 21–27, 2024).
- **Valid day:** a snow value ≥ 0 in a grave's published series (−1 means missing).

## Requirements

### Requirement 1: Start
**User Story:** As a judge, I want every visit to open on the believable daylight viewer and go through the full nightfall, so that I am immersed before I see the graveyard.
#### Acceptance Criteria
1. THE production build SHALL always start in the `day` phase. No URL parameter, setting or stored state SHALL skip daylight, nightfall or the title card.
2. THE dev server only (`import.meta.env.DEV`) SHALL accept `?intro=0` to start at night. This exists for screenshot checks and is compiled out of `npm run build`.
3. THE graveyard SHALL open on Spring 2024, day 0, after nightfall. In the dev server, `?season=` and `?day=` still set the start, as in spec 03.
4. IF the data fails to load, THEN THE App SHALL show the spec 03 error stone, not the daylight viewer.

### Requirement 2: Daylight layout
**User Story:** As a viewer, I want an ordinary agency map, so that the night view is a surprise.
#### Acceptance Criteria
1. THE daylight view SHALL match the board's `dayOn` markup:
   - header with the brand, search field, status chip, Night shift button and avatar;
   - map with the 2023 scar mask, the BC/AB border and labels, 24 markers, the layers card, zoom buttons, scale bar and image credit;
   - aside with the regional status, three stat cards, the five largest burn areas, the night-shift card and the data credit. The board's sound toggle is left out (Requirement 7).
2. THE map SHALL keep the 1060 : 716 aspect and show `viirs-mar25-2024.webp` with the board's filter `saturate(1.08) contrast(1.04)`.
3. THE markers SHALL be at each Spring 2024 grave's published `cx, cy`. Only the first eight SHALL have labels, as on the board.
4. THE scale bar SHALL be 60 km long at the map's current width: 1 grid px = 17/1060° × 111.32 km × cos 57° ≈ 0.972 km.
5. Search, layers, zoom and "View all 24" SHALL be inert, as on the board. They are text, not controls, so the keyboard never stops on a dead control.
6. THE browser tab title SHALL read "Boreal Fire Watch" during `day` and `dusk`, including before the app loads (`index.html`). It SHALL change to "Revenant · What burned last summer is not always dead." when the title card appears, so the tab doesn't give away the reveal (user decision, 2026-11-17).

### Requirement 3: Daylight numbers come from data
**User Story:** As the team, I want the daylight screen to be as honest as the night one, so that the costume never lies.
#### Acceptance Criteria
1. THE status date SHALL be day 0 of Spring 2024, written as "Thu, Mar 21, 2024", with the weekday computed in UTC.
2. EACH burn area's snow value SHALL be the mean of its valid days in the opening week, rounded. An area with no valid day SHALL show "no data" and be left out of the average.
3. THE "Snow on scars" card SHALL show the mean of the burn-area values, labelled "avg, Mar 21–27".
4. THE status SHALL read "All clear" only when no Spring 2024 grave has a published rise on or before day 0. Otherwise it SHALL name how many have.
5. THE first stat card SHALL count burn areas with a rise on or before day 0, labelled "Re-ignited burn areas". It SHALL NOT claim a region-wide hotspot count. The published data has no dated hotspot count for Mar 21, and `early_hits` has no dates.
6. THE status text SHALL say how many burn areas are still mostly snow-covered (snow ≥ 50 %) and SHALL NOT claim that the fire season has not begun.
7. THE status chip SHALL say "Spring 2024 archive", not "Live · updated 12 min ago".
8. THE data credit SHALL name NASA FIRMS (VIIRS 375 m), NASA GIBS and NBAC (NRCan). It SHALL NOT say "Hotspots refresh hourly". The method credit SHALL name Scholten et al. 2021.
9. ALL daylight strings SHALL live in `src/copy/daylight.ts`. Their templates take only published fields.

### Requirement 4: Nightfall
**User Story:** As a viewer, I want the agency viewer to die into the graveyard, so that the reveal feels like a costume change.
#### Acceptance Criteria
1. WHEN the user presses "Night shift" or "Stay until dark", THE App SHALL enter `dusk` for 3.2 s:
   - the daylight view gets `rv-dusk` (the 3.2 s filter drain);
   - the sunset overlay gets `rv-sunset` (3 s sweep);
   - the markers get `rv-dot` (sink 10 px and fade over 1.8 s, after 0.7 s).
2. AFTER `dusk`, THE App SHALL show the title card for 6 s, then enter `night`.
3. Repeated presses during nightfall SHALL NOT restart it.
4. WHEN `night` begins, THE graveyard SHALL mount, and its tombstones SHALL play `rv-emerge` staggered 70 ms (0.15 s + i × 0.07 s), as in spec 03.
5. THE App SHALL expose an `onNight` seam, so that spec 06 can start the Gravekeeper's nightfall line and spec 05 can play the sting and bell.

### Requirement 5: Title card
**User Story:** As a viewer, I want a short black title card, so that the shift from day to night has a beat.
#### Acceptance Criteria
1. THE title card SHALL match the board's `intro` block: background `#020303`, padding 0 12 %, two JetBrains Mono 15 px lines in `#7C8884`, and two IM Fell English italic 54 px lines in bone and ember. The lines appear at 0.2, 0.8, 1.6 and 2.8 s (`rv-line`), and the card fades at the end (`rv-intro`).
2. THE second mono line SHALL read "> ignoring {static} static heat sources ........... listening for heat", where `{static}` is `seasons.static` (591). The board's "gas flares" is narrower than what FIRMS types 2 and 3 cover.
3. THE two serif lines SHALL be verbatim from the brief: "Not every fire goes out in the fall." and "Some wait under the snow."

### Requirement 6: No skipping
**User Story:** As the team, I want every viewer to sit through the whole reveal, so that they are immersed before the graveyard appears.
#### Acceptance Criteria
1. ONCE nightfall starts, it SHALL run to `night` on its timers. No key, button, click or URL parameter SHALL shorten or skip `dusk` or `title`.
2. THE title card SHALL have no controls. Keyboard focus SHALL rest on the card itself (`tabIndex = -1`), so that Tab cannot reach the hidden daylight view behind it.
3. Navigating away or reloading SHALL start again from daylight (Requirement 1.1).

### Requirement 7: Sound
**User Story:** As the team, I want the drone and wind to play for everyone, so that nightfall feels cold.
#### Acceptance Criteria
1. THE App SHALL have no sound toggle and no Sound button: neither the board's daylight toggle nor its night header button. Sound is always on.
2. WHEN the user presses "Night shift" or "Stay until dark", THE App SHALL create or resume a single shared AudioContext inside that click handler. Browsers only allow audio after a user gesture, and this click is the only way into the night. It SHALL then start the wind and play the drone.
   - Wind: looped brown noise, low-pass 420 Hz moved ±180 Hz by a 0.08 Hz LFO, gain ramping to 0.25 over 2 s. It keeps playing through the night.
   - Drone: 55 / 82.4 / 110.5 Hz, gliding down from 1.5× over 3 s; gain 0.18/(i+1), peaking at 1.4 s and gone by 8.5 s.
3. IF the browser has no AudioContext, or audio throws, THEN THE App SHALL stay silent and keep working.
4. Sound SHALL never start before that click.

### Requirement 8: Accessibility
**User Story:** As a keyboard user, I want the opening to be operable, so that I can reach the map.
#### Acceptance Criteria
1. THE daylight controls (Night shift, Stay until dark) SHALL be native buttons with accessible names, a target of at least 40 px (2 px over the board's 38 px), and a visible focus outline (2 px `#0F5C8C` in daylight).
2. Daylight text SHALL meet WCAG AA. The board's `#8696A3` credit and `#7A8B99` search text fail on `#F3F5F7`, so they SHALL be darkened to `#5F7181`.
3. WHEN `night` begins, focus SHALL move to the graveyard headline, so that keyboard and screen-reader users land in the scene.
4. THE daylight view SHALL be a `main` landmark named "Boreal Fire Watch, daylight view". The title card SHALL be a `dialog` named "Revenant title", described by its lines, and focused when it opens.

### Requirement 9: Reduced motion
**User Story:** As a viewer who gets motion-sick, I want the reveal without the movement.
#### Acceptance Criteria
1. WHEN `prefers-reduced-motion: reduce` is set, THE nightfall SHALL keep its full timing (3.2 s dusk, 6 s title) with no movement:
   - dusk SHALL be a plain fade of the daylight view to black (opacity only), with no colour-drain filter, no sunset sweep and no marker sink;
   - the title card SHALL show all four lines at once and hold for 6 s without fading;
   - the tombstones SHALL appear in place.
   These follow the board's reduced-motion rules for `rv-dusk`, `rv-sunset`, `rv-dot`, `rv-line`, `rv-intro` and `rv-emerge`. The fade replaces `rv-dusk`, because the board's rule would leave daylight frozen on screen for 3.2 s.
2. Reduced motion SHALL NOT shorten nightfall or mute the sound.

### Requirement 10: Fidelity check
**User Story:** As the designer, I want to see the daylight view and nightfall next to the board before moving on.
#### Acceptance Criteria
1. AFTER each visible part, THE team SHALL give the user the local link and a Playwright screenshot at 1440 × 1000. The screenshot SHALL be checked against the board's markup values. Differences over 4 px SHALL be fixed or reported.
2. THE nightfall SHALL be checked with screenshots at 0, 1.6, 6.2 and 9.2 s, both with normal and with reduced motion.
