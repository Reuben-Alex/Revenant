"""Agreement with the research baseline in data/seasons.json (task 7.2; Requirements 6.1–6.4)."""

import pytest

from pipeline.rules import classify_season
from pipeline.tests.rules.conftest import research_sha256

EXPECTED_RISEN = {"s2024": 15, "s2025": 8, "s2026": 4}
EXPECTED_ZOMBIE = {"s2024": True, "s2025": False, "s2026": False}

# The stored series is rounded to whole percent; melt was computed on unrounded fractions.
# These two graves differ for that reason and neither rose (docs/method.md). The 0.15 threshold stays strict.
KNOWN_MELT_EXCEPTIONS = {("s2024", "G-16"): (21, 22), ("s2025", "G-10"): (54, 59)}

SEASONS = sorted(EXPECTED_RISEN)


@pytest.mark.parametrize("key", SEASONS)
def test_risen_count(research, key) -> None:  # 6.1
    s = research[key]
    assert classify_season(s.graves, s.chance, s.season_length).risen_count == EXPECTED_RISEN[key]


@pytest.mark.parametrize("key", SEASONS)
def test_stored_rise_reproduced(research, key) -> None:  # 6.1
    s = research[key]
    result = classify_season(s.graves, s.chance, s.season_length)
    for r in result.graves:
        stored = s.stored_rise[r.id]
        got = None if r.rise is None else (r.rise.day, r.rise.x, r.rise.y)
        assert got == stored, r.id


def test_stored_melt_reproduced_except_known_two(research) -> None:  # 6.2
    matches, exceptions = 0, {}
    for key in SEASONS:
        s = research[key]
        for r in classify_season(s.graves, s.chance, s.season_length).graves:
            if r.melt_day == s.stored_melt[r.id]:
                matches += 1
            else:
                exceptions[(key, r.id)] = (s.stored_melt[r.id], r.melt_day)
    assert matches == 70
    assert exceptions == KNOWN_MELT_EXCEPTIONS


def test_known_exceptions_did_not_rise(research) -> None:  # 6.2: counts unaffected
    for key, gid in KNOWN_MELT_EXCEPTIONS:
        assert research[key].stored_rise[gid] is None


@pytest.mark.parametrize("key", SEASONS)
def test_zombie_flag(research, key) -> None:  # 6.3
    s = research[key]
    assert classify_season(s.graves, s.chance, s.season_length).zombie_year is EXPECTED_ZOMBIE[key]


def test_research_shape(research) -> None:
    for s in research.values():
        assert len(s.graves) == 24
        assert s.season_length == 103


def test_research_file_unchanged(research, research_hash_before) -> None:  # 6.4
    for s in research.values():
        classify_season(s.graves, s.chance, s.season_length)
    assert research_sha256() == research_hash_before
