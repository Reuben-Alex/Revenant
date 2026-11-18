# Requirements Document

gravekeeper-and-wager

## Introduction

This spec gives the night a voice and makes it a game. The design is `reference/design/Main.dc.html`, with tokens and the Gravekeeper's lines in #[[file:docs/design-reference.md]]:
- markup: `hasSay` (L308–323), `wagerOpen` (L325–340) and `hasVerdict` (L289–297);
- logic: `say()` (L699), `quiet()` (L675), the verdict in `tick()` (L721), `checkRise()` lines (L758–770), `RV_INTRO_LINES` (L631), `RV_WHISPERS` (L636), `RV_WAGER_VERDICT` (L637) and `rvGlitch` (L638).

It adds:
- **The Gravekeeper:** a narrator panel with a typewriter, speaking at night, at each season's start, at the first thaw, at the risings, at the verdict and when the lantern is lit.
- **Three puzzles** from `docs/brief.md`, "Puzzles":
  1. **Read the stones:** the wager, with clue cards that are published values only.
  2. **The Gravekeeper's riddle:** pick the rule's three conditions.
  3. **Lantern hunt:** find the hidden new fires.
- **Quiet years:** whispers and a glitch, driven by the published `zombie` flag.
- **The verdict card:** observed against chance, the margin, the wager score and "Dig them up again".

Every fact in a line is true for its grave or season: ids, dates, day counts, counts and areas come from `public/data/seasons.json` (honesty.md, gravekeeper-voice.md). Sound stays always on, and the replay runs by itself (specs 04 and 05).

Out of scope: Tonight's narrator lines and Keep watch (spec 07); Is it chance? (spec 02, then spec 08).

## Glossary
- **Line:** one thing the Gravekeeper (or the whisper) says: `{ text, who, start, until }`.
- **Quiet year:** a season whose published `zombie` is false. Today only Spring 2026 is quiet.
- **Marks:** the three graves the viewer chose in the wager.
- **Gravekeeper's guess:** the three largest graves of the season (published order), as the Gravekeeper would bet.
- **Margin:** the fewest risen graves that would have to stay down for the year to fall under 1.4 × chance.

## Requirements

### Requirement 1: The narrator panel
**User Story:** As a viewer, I want an old voice to tell me what I'm seeing, so that the data reads like a story.
#### Acceptance Criteria
1. THE panel SHALL match the board's `hasSay` markup and `say` style:
   - the hooded figure with blinking ember eyes (`rv-eyes`) and a lantern candle (`rv-candle`);
   - the speaker "The Gravekeeper" or "A voice under the snow";
   - the text, revealed at 26 ms per character with a `▌` cursor;
   - a 2 px progress hairline.
   It sits bottom-left of the map, at 11 % from the bottom while the camera holds and 16 px otherwise.
2. A line SHALL stay for its own duration: the given ms, or `max(4800, 30·length + 2800)` ms. A new line replaces the current one.
3. THE panel SHALL be a polite live region. The full line SHALL be announced once, not character by character.
4. Under reduced motion, THE text SHALL appear whole, with no typewriter, and the eyes and candle SHALL not animate.

### Requirement 2: When the Gravekeeper speaks
**User Story:** As a viewer, I want the Gravekeeper to speak at the moments that matter.
#### Acceptance Criteria
1. **Night arrives** (spec 04 `onNight`): "You were looking at fire scars. Look again.\nThese are graves, {n} of them, from the summer of {Y−1}. Wager with me: mark three you think will rise." Here `{n}` is the number word for the Spring 2024 grave count.
2. **A season starts** (tab or Register): the season's intro line, built from data:
   - 2024: "Last autumn I buried {n} of them. The summer of {Y−1} burned more of this country than any I remember.\nMark three, or just watch the snow." The record claim is cited in the copy to Natural Resources Canada ("Canada's record-breaking wildfires in 2023": about 15 Mha, more than double the 1989 record) and to Jain et al. 2024, Nature Communications 15, "Drivers and impacts of the record-breaking 2023 wildfire season in Canada".
   - 2025 and 2026: "{n} more, from the fires of {Y−1}." followed by a comparison of the total area of this season's graves with the previous season's, from the published sizes: "A gentler summer: these {n} cover about {km} km², where {Y−2}'s covered {km′}." when smaller, or "A harder summer…" when larger. Then "\nLet us see whether they stay down." The totals are of the graves shown (the 24 largest scars in the region), and the line says so.
   This replaces the board's "Fewer, and smaller": every season has 24 graves, so "fewer" is false.
3. **First thaw:** on the first day a grave's melt day is reached (and it doesn't rise that day): "The snow is leaving {id}.\nFifty days, now. If it means to rise, it will rise soon." Once per replay.
4. **Risings** (spec 05 `onRising`):
   - beats 1–3 use the board's three lines verbatim, with `{id}`, `{Y−1}` and the "{n} days ago" / "this very day" clause;
   - later risings rotate the board's five `RV_RISE_LINES`, with each grave's own day count;
   - a marked grave gets "Your mark. " before its beat line, or "Your mark, {id}. It walks. My lantern burns brighter for you." otherwise.
5. **The lantern is lit:** "Hold the lantern low. The names are still on the stones."
6. **The verdict:** see Requirement 7.
7. Lines SHALL come from `src/copy/gravekeeper.ts`, follow `.kiro/steering/gravekeeper-voice.md`, and take only published fields.

### Requirement 3: Quiet years
**User Story:** As a judge, I want the costume to admit when a year shows nothing, so that I trust the years that do.
#### Acceptance Criteria
1. A season SHALL be quiet when its published `zombie` is false. No year is hard-coded.
2. IN a quiet year, whispers from "A voice under the snow" SHALL come on replay days 22, 48 and 76, if no line is showing. They are the board's four lines, lower case and terse, in JetBrains Mono `#9FD8CC` with a red/cyan split shadow.
3. IN a quiet year, while the replay runs or the verdict shows:
   - every ~5 s (3 of every 46 ticks of 110 ms), the map SHALL jitter for 0.33 s (`rv-glitch`);
   - the narrator text and the current Register row SHALL show the board's `▓▒░█⁂§` substitution (`rvGlitch`, 22 % of non-space characters).
   The accessible text (live region, `aria-label`) SHALL stay unglitched.
4. THE glitch SHALL not flash more than 3 times a second, and under reduced motion it SHALL not run at all; the whispers still appear.

### Requirement 4: Read the stones (the wager)
**User Story:** As a viewer, I want to bet on which graves rise, using the same clues the data gives, so that I think like the rule.
#### Acceptance Criteria
1. AT day 0 of each replay (night arrival, season start, "Dig them up again"), THE replay SHALL wait through spec 05's `startGate`. The wager panel matches the board's `wagerOpen` markup: title, prompt line, three slots, "Seal the wager" and "Just watch".
2. WHILE the wager is open, clicking or pressing a stone SHALL mark or unmark it, up to three, with a creak. It SHALL NOT open the exhumation.
3. WHILE the wager is open, hovering or focusing a stone SHALL show its clue card. The card holds only published values:
   - footprint ≈ {km} km²;
   - latitude {lat}°N;
   - "snow left {date}", or "snow never left" for melt −1;
   - "heat on the scar before the thaw: {early}", or "no heat before the thaw".
   The board's clue "the biggest scars, where the snow leaves first" is replaced by "Read the stones: size, latitude, thaw and early heat. Hover or focus one."
4. "Seal the wager" SHALL be enabled only with three marks. It plays one bell, says "Sealed: {ids}.\nNow we watch the snow." and opens the gate. "Just watch" opens the gate with no marks.
5. Marked stones SHALL show a small candle. Each mark that rises SHALL grow the lantern radius by 30 px (130 + 30·hits).
6. Opening the gate SHALL be the only way past day 0. Dragging the candle past day 0 counts as "Just watch".

### Requirement 5: The Gravekeeper's riddle
**User Story:** As a viewer, I want to prove I understand why a grave rose, so that the rule sticks.
#### Acceptance Criteria
1. AT the first beat of a replay, after the beat line, THE riddle card SHALL open over the map: "Why did {id} rise? Choose the three that must all be true." The clock waits while it is open.
2. THE card SHALL show four cards in a shuffled order seeded by the season year:
   - the three true conditions: "On last year's scar, within ≈ {proximity_km} km", "After the snow left the scar" and "Within 50 days of the thaw";
   - one decoy, chosen by the season year: "Before the snow left", "The brightest heat in the region" or "Anywhere in the province".
3. Choosing three cards and pressing "Dig" SHALL check them. When they are right, the Gravekeeper says "Yes. All three, on {id}." and the grave's exhumation opens. When they are wrong, a hint names the decoy's flaw (from copy), the choice stays, and the viewer can try again. There is no penalty and no limit.
4. "Let it lie" SHALL close the riddle without answering. The riddle comes once per replay.
5. EVERY card SHALL be a native toggle button with `aria-pressed`, 40 px tall, keyboard reachable. The card is a dialog that takes focus and returns it when it closes.

### Requirement 6: Lantern hunt
**User Story:** As a viewer, I want to search the dark for fires that aren't revenants, so that I learn the difference.
#### Acceptance Criteria
1. WHILE the lantern is on, THE season's visible new fires (first day ≤ current day) SHALL be hidden unless they are within the lantern radius or already found.
2. A fire SHALL be found when the lantern centre comes within the radius − 10 of it (pointer or keyboard focus). The Gravekeeper then says "That one is not mine. {id} burned more than ≈ 15 km from every scar." and the counter updates: "{found} of {total} new fires found".
3. WHEN all are found: "All {total} found. Not one of them was mine." Found fires stay shown for the rest of the replay. The count resets with the season.
4. THE counter SHALL be visible while the lantern is on and announced politely.

### Requirement 7: The verdict
**User Story:** As a judge, I want the season's result stated plainly, with the chance baseline, so that the costume is honest.
#### Acceptance Criteria
1. AT day 102, THE verdict card SHALL show the board's `hasVerdict` markup:
   - "The verdict of spring {Y}";
   - "{N word} of {n} rose.";
   - the detail;
   - the wager line, if sealed;
   - "Dig them up again".
   The bell SHALL toll 3 times in a zombie year and once otherwise (board `playBell(zombie ? 3 : 1)`).
2. THE detail SHALL use published fields only: "The same shapes laid on unburned ground caught heat {chance %}% of the time." Then:
   - in a zombie year: "These scars woke {ratio} times as often as chance: a zombie year, after the fires of {Y−1}." Here ratio = (risen / n) / chance, to one decimal (2.2 for 2024, 1.7 for 2025). This replaces the board's "far more often … after the great fires of 2023", which is wrong for 2025.
   - in a quiet year: "These scars woke no more often than chance. Revenant says so, rather than cry wolf." Spring 2026 woke at 8 % against 12 % chance, so the board's "about as often" would be generous.
3. THE Gravekeeper SHALL say: "{N word} of {n} rose. Chance alone would have raised {C word}.\n" followed by "This was a zombie year." or "These were ordinary spring fires, not the dead walking. I do not cry wolf." Here C = round(chance × n).
4. IF the margin is 1 or 2 graves, THEN the detail SHALL add: "A thin margin: {k word} fewer and I would have called it chance." For Spring 2025 the published data gives k = 2. method.md asks for the thin margin to be said.
5. THE wager line SHALL read: "Your wager: {k word} of your three walked ({ids}). Picking blind, you would expect {3·N/n, one decimal}. The Gravekeeper, betting on the three largest, got {g word}." It is followed by the board's ranked line for k = 0–3.
6. "Dig them up again" SHALL restart the replay at day 0 with the wager open. The Gravekeeper says "Again, then. Mark three, or just watch."

### Requirement 8: Accessibility and motion
**User Story:** As a keyboard or screen-reader user, I want to play every puzzle.
#### Acceptance Criteria
1. EVERY control in the wager, riddle and verdict SHALL be a native button, at least 40 px, with a visible focus ring and an accessible name. Marking a stone by keyboard uses the stone's existing button.
2. THE wager panel, riddle card and verdict card SHALL be announced: a region, a dialog and a status. Each SHALL be reachable by Tab, and SHALL NOT trap focus except the riddle dialog, which returns focus when it closes.
3. Text SHALL meet WCAG AA on its background.
4. Under reduced motion: no typewriter, no glitch, no eye blink; the panels appear without sliding.

### Requirement 9: Fidelity and checks
**User Story:** As the designer, I want to see each puzzle next to the board before moving on.
#### Acceptance Criteria
1. AFTER each visible part, THE team SHALL give the user the local link and Playwright screenshots at 1440 × 1000:
   - the wager with a clue card;
   - the riddle;
   - the lantern hunt;
   - a zombie and a quiet verdict;
   - a whisper with the glitch.
   Differences over 4 px from the board SHALL be fixed or reported.
2. `npm run check` and `npm run gate` SHALL pass, and the `honesty-review` hook SHALL have reviewed `src/copy/gravekeeper.ts`.
