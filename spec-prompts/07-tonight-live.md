# Spec prompt — tonight-live (Design-first)
Design the live "Tonight" season fed by the nightly pipeline: current-year scars, latest true-colour frame, per-scar snow % (last 3 days max),
heat in the last 14 days ("still warm"), last-7-day hotspot clusters (flares removed), 2027 watch list ranked by size and late heat,
countdown to expected spring melt, "data as of" stamp, graceful staleness (if data older than 48 h, the Gravekeeper says so).
Also the 390 px crew phone view (`reference/design/Phone.dc.html`) and the grave dossier (`reference/design/Dossier.dc.html`),
plus a static 1920×1080 route for capturing the video's opening frame (`reference/design/Opening.dc.html`). Decide hosting here: a free static host that stays up, free, through Jan 29, 2027.

Design source (use skill /design-boards): `reference/design/Main.dc.html` block `isTonight` L484, and the three boards above.
