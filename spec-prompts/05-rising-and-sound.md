# Spec prompt — rising-and-sound (Requirements-first)
When a grave rises during replay: pause the clock, zoom the map camera 2.4× onto the real hotspot (clamped to edges), letterbox,
ember underglow, fissures drawn from the hotspot, ground heave ring, burning hand burst, sparks; bell tolls once per risen grave
(max 5); hold 6 s for the first three risings and 3 s after; skip the zoom at 2× speed except the first three; restore camera.
WebAudio only: wind bed, boom+crackle, bell partials, creak, nightfall drone (specs in #[[file:docs/design-reference.md]]).
Audio starts only after a user gesture; full reduced-motion path (no zoom, a static glow instead).

Design source (use skill /design-boards): `reference/design/Main.dc.html` blocks `camOn` L209 and L263, `hasSting` L300; logic in `tick()` L703, `playBell()` L784, `startAudio()` L798, `stopAudio()` L822.
