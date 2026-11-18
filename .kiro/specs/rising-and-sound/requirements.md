# Requirements Document

rising-and-sound

## Introduction

This spec builds the moment a grave rises, and the sounds of the night. The design is `reference/design/Main.dc.html`, with tokens and the motion and sound tables in #[[file:docs/design-reference.md]]:
- markup: `camOn` (L208–220, L262–265) and `hasSting` (L299–305);
- logic: `checkRise()` (L740), `tick()` (L703), and the camera and `cine` values in `renderVals()` (L1250–1268, L1380–1384);
- sound: `playSting()` (L825), `playBell()` (L784) and `playCreak()` (L841).

When the replay reaches a grave's published rise day:
- the map shakes and a sting names the grave;
- the camera zooms 2.4× onto the real hotspot, with a letterbox, an ember underglow, fissures, a ground heave, a burning hand and sparks;
- a boom and crackle play, and a bell tolls.

The first three risings of a replay are story beats that hold the clock for 6 s. Later risings hold for 3 s.

The replay runs by itself (user decision, 2026-11-18). There is no play/pause button. Time starts when night arrives or a season is chosen. It waits while the viewer looks closer, and the viewer steers it by dragging the candle or changing speed (Requirement 9). This amends spec 03 Requirement 12.

Every rising is a published result: the grave, its rise day, its rise point and its melt day come from `public/data/seasons.json` (honesty.md). The UI doesn't re-implement the rule.

Sound is always on, with no Sound button (spec 04 immersion decision). The shared AudioContext only exists after the Night shift click, so nothing plays before that gesture.

Out of scope:
- the Gravekeeper's lines for the beats and later risings, and "Your mark" for wagered graves (spec 06, through the `onRising` seam);
- the verdict and its bell (spec 06 calls `playBell`);
- the quiet-year glitch (spec 06).

## Glossary
- **Board:** `reference/design/Main.dc.html`.
- **Rising:** one or more graves whose published `rise.day` falls in a forward step of the replay `(from, to]`. The first of them, in published order, is the **lead**.
- **Beat:** one of the first three risings reached by *playing* (not scrubbing) since the replay started. The board's `storyBeats` default is 3.
- **Hold:** a period when the clock doesn't advance while the camera is on a hotspot.
- **Sting:** the flash, shake and title shown for every rising.

## Requirements

### Requirement 1: Detecting a rising
**User Story:** As a viewer, I want each grave to rise on the day the data says, so that the drama follows the data.
#### Acceptance Criteria
1. WHEN the replay moves forward from `from` to `to` (by play or scrub), THE App SHALL find the graves of the current season whose published `rise.day` is in `(from, to]`. IF there are any, THEN THAT is a rising, with the first in published order as the lead.
2. Moving backward, Tonight and seasons without risings SHALL never produce a rising.
3. A rising reached by playing allows a beat and the camera. A rising reached by scrubbing gets the sting and the boom only (board `checkRise(from, v, false)`).
4. THE beat count SHALL reset when the season changes and when the replay restarts from day 0 (Requirement 9.4). It SHALL NOT reset on scrubbing.

### Requirement 2: Sting
**User Story:** As a viewer, I want a rising announced, so that I don't miss it.
#### Acceptance Criteria
1. FOR every rising, THE map SHALL show the board's sting for 4.5 s:
   - a radial flash centred on the lead's rise point (`rv-flash`);
   - the title in IM Fell English SC 62 px, `#F4E9DA` with an ember glow: "{id} has risen", or "{n} graves have risen" when several rise on the same step (`rv-sting`);
   - the detail in JetBrains Mono 13 px, letter-spacing 3 px: "{DATE} · DAY {d} AFTER SNOWMELT" for one grave, or "{DATE} · G-13 DAY 0 · G-24 DAY 26 AFTER SNOWMELT" for several (`rv-sting`).
   The map SHALL also shake (`rv-shake`, 0.7 s).
2. `{DATE}` SHALL be the rise date, from Mar 21 of the season year. Each `{d}` SHALL be that grave's own published `rise.day − melt`. The board printed the lead's count for every grave on a shared day, which is wrong for the others: on Spring 2024 day 30, G-13 rose 0 days after its melt and G-24 rose 26 days after.
3. THE sting text SHALL also be placed in a polite live region, so that screen readers announce it once.
4. A new rising within 1 s of the last flash SHALL update the sting text but SHALL NOT restart the flash or the shake. This keeps flashes under 3 per second at 2× speed (costume.md, WCAG 2.3.1).

### Requirement 3: Camera and cinematic
**User Story:** As a viewer, I want the camera to go to the hotspot, so that I see where the heat came back.
#### Acceptance Criteria
1. THE camera SHALL zoom onto the lead's rise point when the rising was reached by playing, the lantern and before/after are off, and either it is a beat or the speed is not 2×.
2. THE camera SHALL scale the map's content layer 2.4× from its top-left corner (`transform-origin: 0 0`):
   - The translate is `tx = clamp(50 − 2.4·x/1060·100, 100 − 240, 0)` % and `ty = clamp(50 − 2.4·y/716·100, 100 − 240, 0)` %, so the zoomed map always covers the frame.
   - Zooming in eases over 1.15 s with `cubic-bezier(.6,.05,.25,1)`. Returning eases over 1.5 s with `cubic-bezier(.45,0,.2,1)` back to the identity.
3. THE content layer SHALL be what the board's camera wraps: imagery, scars, fog, border, candles, tombstones, the cinematic, snowfall, grain, vignette, callout, hit targets and tooltip. The letterbox, sting, credit chip, overlays and exhumation panel stay outside it.
4. WHILE the camera is on, THE map SHALL show the board's cinematic at the rise point:
   - letterbox bars 9 % high (`rv-lbt`, `rv-lbb`, 0.6 s);
   - the ember underglow (`rv-underglow`);
   - nine fissures (`rvFissures`), drawn at 0.55 s, with a hot core;
   - the heave ring at 1.25 s;
   - the burning hand (`rvHand` × 1.25) bursting at 1.45 s;
   - three looping sparks.
   The lead's tombstone hides its own small hand while the cinematic hand is up.
5. THE camera SHALL hold for 6000 ms on a beat and 3000 ms otherwise, then return.

### Requirement 4: Hold and the clock
**User Story:** As a viewer, I want the replay to wait while a grave rises, so that I can watch it.
#### Acceptance Criteria
1. WHILE the camera holds, THE replay clock SHALL NOT advance. It continues when the hold ends.
2. Switching season, scrubbing, opening the lantern or before/after, or opening an exhumation SHALL end the hold, and the camera SHALL return.
3. THE lead SHALL become the selected grave (board `selected: g.id`).

### Requirement 5: Sounds
**User Story:** As a viewer, I want to hear the dead rise, so that the night feels alive.
#### Acceptance Criteria
1. THE App SHALL play these sounds with the board's values, through the shared AudioContext of spec 04. Every sound SHALL be silent when there is no context yet (before the Night shift click, or with no Web Audio), and SHALL never throw.
   - **Boom and crackle** (`playSting`): a sine from 70 to 32 Hz over 1.6 s, gain rising to 0.7 in 0.04 s and decaying by 2.2 s. Plus 1.2 s of sparse noise (p = 0.004, fading linearly), high-passed at 1800 Hz at gain 0.9, starting at +0.05 s.
   - **Bell** (`playBell(n)`): n strikes, the i-th at +0.8 + 1.05·i s. Each strike has sine partials 164 × {1, 2.4, 3.0, 4.5} Hz at gains {0.32, 0.16, 0.11, 0.05}, a 12 ms attack, and decay over 3.4 / (1 + 0.6·j) s.
   - **Creak** (`playCreak`): a sawtooth from 110 to 70 Hz over 0.5 s through a band-pass at 600 Hz (Q 6), gain rising to 0.18 in 0.05 s and gone by 0.6 s.
2. EVERY rising SHALL play the boom, at most once per second.
3. WHEN the camera moves for a rising, THE bell SHALL toll `min(5, graves risen by day to)` times.
4. WHEN nightfall reaches night (the spec 04 `onNight` seam), THE App SHALL play the boom and one bell (board `nightfall()` L684).
5. Opening an exhumation from a stone or a grave card SHALL play the creak.
6. THERE SHALL be no Sound button or mute control (spec 04 immersion decision).

### Requirement 6: Seam for the Gravekeeper
**User Story:** As the team, I want spec 06 to speak at each rising, so that the narrator can be added without reworking this one.
#### Acceptance Criteria
1. THE graveyard SHALL accept `onRising(event)`, called once per rising. The event is `{ ids, lead, days, beat: 1 | 2 | 3 | null, camera: boolean, season, year }`, with every field taken from the published data.

### Requirement 7: Reduced motion
**User Story:** As a viewer who gets motion-sick, I want the risings without the camera moves.
#### Acceptance Criteria
1. WHEN `prefers-reduced-motion: reduce` is set:
   - THE camera SHALL still zoom 2.4× onto the hotspot (user decision, 2026-11-18), but as an instant cut with no glide in or out;
   - the letterbox SHALL appear and disappear at once, without sliding;
   - there SHALL be no shake and no sparks;
   - the cinematic SHALL show in its final, still state: underglow, fissures, heave ring and hand;
   - the flash SHALL show as a still glow for the 4.5 s of the sting, and the sting text SHALL appear without movement.
   This is the board's reduced-motion rule set, with the camera's glide replaced by a cut. The board left the glide on.
2. THE hold, the zoom, the selection, the sting text and the sounds SHALL be the same as with motion.

### Requirement 8: Fidelity and checks
**User Story:** As the designer, I want to see a rising next to the board before moving on.
#### Acceptance Criteria
1. AFTER the cinematic is built, THE team SHALL give the user the local link and Playwright screenshots of the first Spring 2024 rising (G-10, Apr 7) at 0.3, 1.5 and 3 s, with normal and with reduced motion (the reduced-motion shots show the cut-in zoom). They SHALL be checked against the board's values; differences over 4 px SHALL be fixed or reported.
2. `npm run check` and `npm run gate` SHALL pass.

### Requirement 9: The replay runs by itself
**User Story:** As a viewer, I want the spring to unfold on its own, so that I stay inside the story instead of operating a player.
#### Acceptance Criteria
1. THE footer SHALL have no play/pause button. It keeps the ½× / 1× / 2× speed buttons, the date and sub-label, and the candle timeline (spec 03 Requirement 12.3–12.5).
2. THE replay SHALL start by itself at day 0:
   - when the graveyard opens after nightfall;
   - when a replay season is chosen from a tab or the Parish Register.
   It advances at the chosen speed (1300 / 650 / 325 ms per day) and stops at day 102. Tonight has no replay.
3. THE replay SHALL wait, and resume when the viewer is done:
   - while an exhumation panel is open;
   - while the lantern or before/after is on;
   - while the timeline is being dragged;
   - during a rising's hold (Requirement 4).
4. AT day 102 the replay SHALL stay on the last day. Dragging the candle back starts it again from that day. Choosing the same season again restarts it from day 0. Spec 06 adds the verdict and "Dig them up again" here.
5. THE sub-label SHALL say what time is doing, from `src/copy/`: running at a speed, waiting while the viewer looks, or the spring is over.
6. Spec 06 may hold the replay at day 0 for the wager through a `startGate` seam. The default is no gate.
7. Caveat for the write-up: WCAG 2.2.2 (Pause, Stop, Hide) asks for a way to pause motion that starts by itself and lasts more than 5 s. Here the replay waits whenever the viewer opens anything, and the candle can be dragged to any day. Like always-on sound, this is a deliberate costume choice.
