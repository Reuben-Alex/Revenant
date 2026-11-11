"""Example tests for classify_grave, classify_season and is_zombie_year (Requirements 5.1–5.5)."""

import pytest

from pipeline.rules import (
    GraveInput,
    Hotspot,
    Rise,
    State,
    classify_grave,
    classify_season,
    is_zombie_year,
)

N = 10
SNOWY = (0.9,) * N
MELTS_AT_2 = (0.9, 0.9) + (0.0,) * (N - 2)


def grave(id: str, snow=MELTS_AT_2, hotspots=()) -> GraveInput:
    return GraveInput(id=id, size=1, cx=0.0, cy=0.0, snow=snow, hotspots=tuple(hotspots))


def test_classify_grave_combines_melt_rise_and_states() -> None:
    hs = (Hotspot(1, 5.0, 5.0, True), Hotspot(4, 7.0, 8.0, True))
    r = classify_grave(grave("G-01", hotspots=hs), N)
    assert r.melt_day == 2
    assert r.rise == Rise(4, 7.0, 8.0)
    assert r.early_hits == 1  # the day-1 hit, before melt
    assert r.states[:5] == (State.BURIED, State.BURIED, State.WAKING, State.WAKING, State.RISEN)
    assert r.days_since_melt[:3] == (None, None, 0)


def test_classify_grave_validates() -> None:
    with pytest.raises(ValueError):
        classify_grave(grave("G-01", snow=(0.5,) * (N - 1)), N)


def test_season_summary() -> None:  # 5.1, 5.2, 5.5
    risen = grave("G-01", hotspots=[Hotspot(3, 1.0, 1.0, True)])
    waking = grave("G-02")
    buried = grave("G-03", snow=SNOWY, hotspots=[Hotspot(3, 1.0, 1.0, True)])
    s = classify_season([risen, waking, buried], chance=0.2, season_length=N)
    assert [g.id for g in s.graves] == ["G-01", "G-02", "G-03"]  # input order kept
    assert s.risen_count == 1
    assert s.chance == 0.2
    assert s.season_length == N
    assert s.graves[2].melt_day is None and s.graves[2].rise is None


def test_season_zombie_flag_uses_risen_share() -> None:  # 5.3
    hs = [Hotspot(3, 1.0, 1.0, True)]
    s = classify_season([grave("G-01", hotspots=hs), grave("G-02")], chance=0.3, season_length=N)
    assert s.zombie_year is True  # 1/2 = 0.5 > 1.4 x 0.3 = 0.42
    s = classify_season([grave("G-01", hotspots=hs), grave("G-02")], chance=0.4, season_length=N)
    assert s.zombie_year is False  # 0.5 > 0.56 is false


def test_zombie_threshold_just_above_and_below() -> None:  # 5.3
    # 1.4 x 0.25 = 0.35: 9/24 = 0.375 is above, 8/24 = 0.333 is below
    assert is_zombie_year(9, 24, 0.25) is True
    assert is_zombie_year(8, 24, 0.25) is False


def test_zombie_threshold_is_strict() -> None:  # 5.3: equal share is not a zombie year
    assert 7 / 10 == 1.4 * 0.5  # exactly equal in floating point
    assert is_zombie_year(7, 10, 0.5) is False


def test_zero_graves_raises() -> None:  # 5.4
    with pytest.raises(ValueError):
        is_zombie_year(0, 0, 0.2)
    with pytest.raises(ValueError):
        classify_season([], chance=0.2, season_length=N)
