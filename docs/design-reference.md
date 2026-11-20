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
| Haunted tab (added) | Night only: while the page is hidden, the tab title is a line from the graves on screen and the icon is lit (`public/icon-haunted.svg`); both restore on return |

## Sound (WebAudio, no files)
Wind: looped brown noise → low-pass 420 Hz with 0.08 Hz LFO. Rising: 70→32 Hz sine boom + high-pass crackle; with the camera, a heartbeat of 4 lub-dub pairs (62→38 Hz sine thumps) at 0.12, 0.62, 0.98 and 1.22 s, ending before the hand at 1.45 s (added). Bell: 164 Hz partials ×1, 2.4, 3.0, 4.5, 3.4 s decay. Creak: band-passed saw 110→70 Hz. Nightfall drone: 55/82/110 Hz glide, 8 s.

## Gravekeeper lines (verbatim)
- Nightfall: "You were looking at fire scars. Look again. These are graves, twenty-four of them, from the summer of 2023. Wager with me: mark three you think will rise."
- 2024 start: "Last autumn I buried twenty-four of them. The summer of 2023 burned more of this country than any I remember. Press play, and watch the snow."
- 2025: "Twenty-four more, from the fires of 2024. A gentler summer. Let us see whether they stay down."
- 2026: "The scars of 2025. Fewer, and smaller. I do not expect much from them. I will watch all the same."
- Tonight: "Tonight I am burying the fires of 2026. Thirteen of them were still warm when the first snow came. I will be watching them in April."
- First thaw: "The snow is leaving {id}. Fifty days, now. If it means to rise, it will rise soon."
- Beat 1: "{id}. I buried it last autumn, under the fires of {Y-1}. The snow let go of it {n} days ago. It was not ready to stay down."
- Beat 2: "{id} too. Each stone wakes when its own snow goes. Mark where the hand broke through: that is where the heat came back."
- Beat 3: "{id}. From here I will let them rise on their own. Touch any stone and I will dig it up for you."
- Later risings (rotate): "The ground gives way at {id}." · "Another. {id}, {n} days after the thaw." · "{id} has risen." · "I hear {id} stirring. There." · "{id}. They are restless this spring."
- Wager hit: "Your mark, {id}. It walks. My lantern burns brighter for you."
- Verdict: "{N} of twenty-four rose. Chance alone would have raised {C}." + "This was a zombie year." | "These were ordinary spring fires, not the dead walking. I do not cry wolf."
- Wager verdicts (0–3 hits): "The dead keep their secrets from you." · "Beginner's luck." · "You have been here before." · "You have the gift. Stay away from my graveyard."
- Whispers (quiet years, "A voice under the snow"): "the dead are lying to you" · "these are only spring fires" · "nothing is buried here. nothing." · "chance. it is only chance."
- Epitaph template: "Here lies some {km} km² of {region}, burned in the summer of {Y-1}. Buried by winter. The snow let go on {melt}; {n} days later it rose."
