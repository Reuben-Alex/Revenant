---
inclusion: fileMatch
fileMatchPattern: ["src/**/*.tsx", "src/**/*.css"]
---
# Costume rules (UI)
Match the design boards in `reference/design/` and the tokens, components and motion table in #[[file:docs/design-reference.md]].
- Night UI never looks like a dashboard kit: tombstone tabs, iron-plate buttons, carved cards, parchment register, candle timeline.
- Daylight UI is the opposite: clean, believable SaaS (Inter, white cards, #0F5C8C).
- Every animation has a reduced-motion fallback; never flash more than 3 times per second.
- Text over imagery needs a scrim or stroke; keep 4.5:1 contrast for body text.
