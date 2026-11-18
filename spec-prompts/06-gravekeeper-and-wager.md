# Spec prompt — gravekeeper-and-wager (Requirements-first)
Narrator: a queue of timed lines with typewriter reveal (26 ms/char), progress hairline, portrait with blinking eyes; triggers for
season start, first thaw, first three risings (via spec 05's `onRising` seam: beats hold the replay), later risings (rotating lines), verdict, lantern on.
Copy lives in `src/copy/` and must follow the gravekeeper-voice and honesty steering. Narrator copy can be drafted with the `gravekeeper` custom agent.

Puzzles (docs/brief.md, "Puzzles" 1–3). The replay runs by itself with no play button (spec 05 Requirement 9); use its `startGate` seam.
- **Read the stones** (the wager): at day 0 of each replay the replay waits while the viewer marks exactly 3 graves (candles on stones).
  Clue cards on hover/focus are published values only: size (km²), latitude, melt date, heat on the scar before melt (`early_hits`).
  Seal starts the replay; "Just watch" starts it without marks. On each correct rise the lantern radius grows 30 px and the narrator
  acknowledges ("Your mark…"). Verdict: hits vs blind expectation (3 × risen/24) and vs the Gravekeeper's guess (the 3 largest scars), plus the ranked line.
- **The Gravekeeper's riddle**: at the first beat, pick the three true conditions of the rule from four cards (one decoy misconception);
  right picks open that grave's exhumation; wrong picks get a hint, never a penalty. Once per replay.
- **Lantern hunt**: in lantern mode the season's new fires are hidden until the lantern passes over them; each found reads
  "Not a revenant: more than 15 km from every scar"; the narrator counts them.

Quiet years come from the published `zombie` flag, never hard-coded years (today only Spring 2026 is quiet): brief glitch every ~5 s
(map jitter, ▓▒░ substitution in narrator and register), three whispers per season from "A voice under the snow". The verdict line also comes from the flag.
Spec 05 bell: the verdict tolls `playBell(zombie ? 3 : 1)`.

Design source (use skill /design-boards): `reference/design/Main.dc.html` blocks `hasSay` L308, `wagerOpen` L326, `hasVerdict` L290; logic in `say()` L699, `quiet()` L675, verdict in `tick()` L721, `RV_INTRO_LINES` L631, `RV_WHISPERS` L636.
