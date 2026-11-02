# Spec prompt — daylight-nightfall (Quick Spec)
Implement the opening: "Boreal Fire Watch" daylight viewer (clean SaaS look, real snow % per burn area, BA-01… markers, All clear status,
Night shift button and "Stay until dark" card), then nightfall: 3.2 s colour drain + sunset sweep + markers sink + drone, 6 s title card,
then tombstones emerge staggered and the Gravekeeper's nightfall line. Sound toggle before nightfall. A setting skips straight to night.
Reference: #[[file:docs/design-reference.md]].

Design source (use skill /design-boards): `reference/design/Main.dc.html` blocks `dayOn` L492 and `intro` L574; logic in `nightfall()` L676.
