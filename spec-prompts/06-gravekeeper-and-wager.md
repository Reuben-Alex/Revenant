# Spec prompt — gravekeeper-and-wager (Requirements-first)
Narrator: a queue of timed lines with typewriter reveal (26 ms/char), progress hairline, portrait with blinking eyes; triggers for
season start, first thaw, first three risings (story beats that pause replay), later risings (rotating lines), verdict, lantern on.
Copy lives in `src/copy/` and must follow the gravekeeper-voice and honesty steering. Wager: before replay, mark exactly 3 graves
(candles on stones, hover clues = size + latitude), seal or skip; on each correct rise the lantern radius grows 30 px and the narrator
acknowledges; verdict shows hits vs blind expectation (3 × risen/24) and a ranked line. Quiet years (2025, 2026): brief glitch every ~5 s
(map jitter, ▓▒░ substitution in narrator and register), three whispers per season from "A voice under the snow".
Decide quiet year and the verdict line from the published zombie-year flag, not from hard-coded years. Narrator copy can be drafted with the `gravekeeper` custom agent.

Design source (use skill /design-boards): `reference/design/Main.dc.html` blocks `hasSay` L308, `wagerOpen` L326, `hasVerdict` L290; logic in `say()` L699, `quiet()` L675, verdict in `tick()` L721, `RV_INTRO_LINES` L631, `RV_WHISPERS` L636.
