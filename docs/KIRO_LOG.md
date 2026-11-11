# Kiro log

Feeds the "how Kiro was used" write-up. Newest entries last.

## 2026-11-02
- **Claude Code** set up this repo: `.kiro` steering, hooks, skills and the `gravekeeper` agent; spec prompts; docs aligned with the Official Rules. No specs or app code yet.
- **Claude Code** checked the melt rule against `data/seasons.json`: it reproduces 70 of 72 stored melt days and all Risen counts (15, 8, 4). The other two graves differ because the stored series is rounded; both are noted in spec prompt 01.
- Specs are to be generated in Kiro from `spec-prompts/`.
## 2026-11-11
- **Spec 01 zombie-rule-engine done** (Kiro spec, 8 tasks): pure Python rule engine in `pipeline/rules/`, 108 tests green under `HYPOTHESIS_PROFILE=ci` (Hypothesis, 1000 examples per property). It reproduces the research results: Risen 15/8/4, every stored rise, 70/72 stored melt days (the 2 rounding exceptions asserted), zombie flags 2024 yes / 2025 and 2026 no.
- **PBT:** no property failed on the real code. To check the properties weren't vacuous, 14 rule bugs were planted one at a time and 13 were caught. The 14th (`>` vs `>=` on the start day) changes nothing, because the window check also covers the start day. One gap found this way: random hotspot days missed the window edges, so Property 10 now aims at melt−1 and melt+51.
- **Demo-worthy:** the spec grew Requirements 1.10–1.15 mid-build, so CSV values that were parsed wrongly fail loudly. For example, `on_scar="False"` is truthy in Python and would have faked a Risen grave. `guard-data` and `pipeline-tests` hooks active.
