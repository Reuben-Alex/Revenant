# Design reference

Source of truth: the design boards in `reference/design/`.

## Tokens
| Token | Value | Use |
|---|---|---|
| bg | `#050807` / panels `#070C0B`, `#0A110F` | Night |
| bone | `#ECE6D6` | Primary text |
| ash | `#A3ADA8`, `#7C8884` | Secondary text |
| ember (accent, tweakable) | `#FF6B2C` | Risen, hand, cracks, drips |
| teal | `#7FE0CF` | Waking, windows, whispers |
| candle | `#F2C14E`, flame `#FFB86B`, core `#FFF1C9` | New fires, flames |
| parchment ink | `#E6D6AE`, `#D8C8A0`, `#B8A880`, paper `#18140D`→`#2A2418` | Register, legend, narrator |
| warm (Tonight) | `#E8A07A` | Still-warm scars |
| Daylight | bg `#F3F5F7`, white cards, brand `#0F5C8C`, ok `#17734A`/`#E9F6EF` | Boreal Fire Watch |

Fonts: **IM Fell English** + **IM Fell English SC** (display, epitaphs, narrator), **Inter** (UI, daylight), **JetBrains Mono** (data, coordinates).

## Components
- Tombstone tabs (radius 26 26 3 3, stone gradient), iron-plate buttons (rivets via two radial gradients, inset highlight, 2px black drop).
- Grave cards: carved "HERE LIES / G-03", ember underglow when risen.
- Parish Register: ruled parchment, red-ink bars (risen) vs dashed faint ink (chance).
- Candle timeline: wax from now→end, melted stub behind, flame at playhead, drips at risings.
- Gravekeeper panel: hooded SVG figure, blinking ember eyes, lantern; typewriter 26 ms/char; progress hairline.
- Exhumation panel: tombstone-top sheet sliding from right.

## Motion (all respect `prefers-reduced-motion`)
| Moment | Spec |
|---|---|
| Nightfall | 3.2 s filter drain → sunset sweep → markers sink; 6 s title card; stones emerge staggered 70 ms |
| Rising (beat) | camera 2.4× in 1.15 s, letterbox 0.6 s, underglow 1.6 s, fissures dash-draw 1 s @0.55 s, heave @1.25 s, hand burst @1.45 s, sparks loop; hold 6 s (3 s for later risings); out 1.5 s |
| Thaw | snow cap fades over 3 days; steam + drip ±2 days around melt |
| Rest | stone sinks 5 px, 45% opacity, 1.4 s |
| Quiet-year glitch | every ~5 s for 0.33 s: map jitter/hue, ▓▒░ substitution in narrator + register |
| Replay speed | ½× 1× 2× = 0.75 / 1.5 / 3 days per second |
| Daylight slips (added, not on the boards) | First at 14 s, then every 18–28 s, one at a time in turn: headline smears one letter (0.24 s, screen readers keep the real text) · one marker shows as a stone (0.28 s) · map dims to night (0.16 s). No value changes. Off during dusk and under reduced motion |
| Gravekeeper's gaze (added) | Eyes turn toward the pointer, up to 2.6 × 1.8 hood units, 0.35 s ease-out. Still under reduced motion |
| Haunted tab (added) | Night only, while the page is hidden. Once graves have risen: "They are awake (n)", n = risen on screen, under a burning-hand icon (`public/icon-risen.svg`). Before that: the latest thaw still waking, or buried / at rest (`icon-haunted.svg`). Tonight: "Still warm (n)". Both restore on return |
| Weather readout (added) | Replays. Ash: 2 flecks per risen grave, falling 11–20 s, every 4th still burning. Vignette: clear centre 0.55 − 0.012 per risen, edge 0.75 + 0.007 per risen (max 0.92). Mist: one drifting patch per waking scar, 9 s. All three are in the legend. Ash holds its place and mist stills under reduced motion |
| Panel steps back (added) | While the replay plays, the side panel dims to 30 % (0.8 s) and returns on hover, focus, or anything that stops the clock. A chip on the map keeps the chance comparison: "n risen so far · chance alone would raise c this spring" |
| First rising in the dark (added) | The season's first rising only: the map goes black in 0.2 s except the grave's own ember glow, holds through the camera push, and lifts from the hand burst (1.45 s) to 2.4 s. Off under reduced motion. The wind falls silent with it (0.15 s), stays out 2.4 s and returns over 3 s, so the boom and heartbeat land in silence |
| Banner over everything (added) | While a rising's banner (sting) is up, the grave callout, the tooltip and the chance chip give way, and a pending riddle waits for it to end |
| Embers toward the pointer (added) | Risen graves' embers bend up to 30 grid units toward the pointer as they rise. Straight up with no pointer; still under reduced motion |
| Idle hand (added) | Lantern on and still for 20 s: the nearest risen grave's hand appears at its published hotspot, turned toward the lantern, 1.8 s rise. Gone on the next move. No risen grave, no hand |

## Sound (WebAudio, no files)
Wind: looped brown noise → low-pass 420 Hz with 0.08 Hz LFO. Rising: 70→32 Hz sine boom + high-pass crackle, panned to the grave's x (−0.8 west edge … 0.8 east edge, added); with the camera, a heartbeat of 4 lub-dub pairs (62→38 Hz sine thumps) at 0.12, 0.62, 0.98 and 1.22 s, ending before the hand at 1.45 s (added). Bell: 164 Hz partials ×1, 2.4, 3.0, 4.5, 3.4 s decay. Creak: band-passed saw 110→70 Hz. Nightfall drone: 55/82/110 Hz glide, 8 s.

## Gravekeeper lines (verbatim; revised 2026-11 after approved design feedback: shorter, second person)
Every value in braces comes from the published data, or from the viewer's own clock for the after-dark line.

- Night arrival, only when the viewer's clock reads 19:00–05:59 (3 s, then the nightfall line): "You came after dark. So do they."
- Nightfall: "You were looking at fire scars. Look again. These are graves, {n} of them, from the summer of {Y-1}. Mark the three you think will rise."
- 2024 start: "Last autumn I buried {n}. The summer of {Y-1} burned more of this country than any I remember. Mark three, or just watch."
- 2025, 2026: "{N} more, from the fires of {Y-1}. A gentler summer | A harder summer: these cover about {km} km², where {Y-2}'s covered {km before}. Watch whether they stay down."
- Tonight: "Tonight I bury the fires of {year}. {N} of them were still warm in the last two weeks. Some may be slash piles; crews confirm. I will watch in {month}." (one: "was" · "It may be a slash pile"; none: "None of them was warm in the last two weeks. I will watch in {month} all the same.")
- Tonight, stale: "I have heard nothing new for {n} days. What you see is from {date}."
- First thaw: "The snow is leaving {id}. Fifty days, now. Do not look away."
- Beat 1: "{id}. I buried it after the fires of {Y-1}. The snow left it {n} days ago. It did not stay down." (0 days: "The snow left it this very day.")
- Beat 2: "{id} too. Each wakes when its own snow goes. The hand marks where the heat came back."
- Beat 3: "{id}. From here they rise on their own. Touch a stone, and I will dig it up for you."
- Later risings (rotate): "The ground gives way at {id}." · "Another. {id}, {n} days after the thaw." · "{id} has risen." · "I hear {id} stirring. There." · "{id}. They are restless this spring."
- Wager hit: "Your mark, {id}. It walks. My lantern burns brighter for you." At a beat, a marked grave's line starts "Yours. "
- Lantern: "Hold the lantern low. Not all that burns out there is mine."
- Verdict: "{N} of {n} rose. Chance alone would have raised {C}." + "This was a zombie year. Too many would not stay buried." | "A quiet year. Spring fires, nothing more. I do not cry wolf."
- Wager verdicts (0–3 hits): "The dead keep their secrets from you." · "Beginner's luck." · "You have been here before." · "You have the gift. Stay away from my graveyard."
- Whispers (quiet years, days 22, 48 and 76 in order, "A voice under the snow"): "no one is down here" · "only spring fires" · "nothing under you. nothing." (the fourth, "chance. only chance.", is spare)
- Epitaph template: "Here lies some {km} km² of {region}, burned in the summer of {Y-1}. Buried by winter. The snow let go on {melt}; {n} days later it rose."
