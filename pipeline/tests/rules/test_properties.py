"""Property-based tests: Correctness Properties 1–14 in design.md (tasks 6.2–6.6)."""

import copy
import dataclasses

from hypothesis import given
from hypothesis import strategies as st

from pipeline.rules import (
    GraveInput,
    Hotspot,
    State,
    classify_grave,
    classify_season,
    is_zombie_year,
    melt_day,
)
from pipeline.tests.rules.strategies import (
    grave_and_length,
    hotspots_for,
    season_lengths,
    seasons,
    snow_series,
)

RANK = {State.BURIED: 0, State.WAKING: 1, State.RISEN: 2, State.LAID_TO_REST: 2}


def melt_qualifies(snow, d: int) -> bool:
    """Independent oracle for Requirement 2.1, written with explicit index loops."""
    if snow[d] is None or not snow[d] < 0.15:
        return False
    valid = 0
    for i in range(d, min(d + 7, len(snow))):
        if snow[i] is None:
            continue
        if not snow[i] < 0.15:
            return False
        valid += 1
    return valid >= 3


# --- 6.2 ---------------------------------------------------------------------------------------


@given(grave_and_length())
def test_property_1_states_are_monotonic(gn) -> None:
    """Property 1. Validates: Requirements 4.1–4.4."""
    g, n = gn
    states = classify_grave(g, n).states
    ranks = [RANK[s] for s in states]
    assert ranks == sorted(ranks)
    assert not (State.RISEN in states and State.LAID_TO_REST in states)


@given(grave_and_length())
def test_property_2_never_rises_before_melt(gn) -> None:
    """Property 2. Validates: Requirements 3.3, 4.1."""
    g, n = gn
    r = classify_grave(g, n)
    if r.rise is not None:
        assert r.melt_day is not None and r.rise.day >= r.melt_day
    first_unburied = n if r.melt_day is None else r.melt_day
    assert all(s == State.BURIED for s in r.states[:first_unburied])


@given(grave_and_length())
def test_property_3_risen_implies_window_hotspot(gn) -> None:
    """Property 3. Validates: Requirements 3.1, 3.4."""
    g, n = gn
    r = classify_grave(g, n)
    if r.rise is None:
        return
    assert any(h.on_scar and h.day == r.rise.day for h in g.hotspots)
    assert r.melt_day <= r.rise.day <= min(r.melt_day + 50, n - 1)


# --- 6.3 ---------------------------------------------------------------------------------------


@given(seasons(), st.booleans())
def test_property_4_no_hotspots_no_risings(season, drop_all) -> None:
    """Property 4. Validates: Requirements 3.5, 5.1."""
    gs, chance, n = season
    if drop_all:
        stripped = [dataclasses.replace(g, hotspots=()) for g in gs]
    else:
        stripped = [
            dataclasses.replace(g, hotspots=tuple(dataclasses.replace(h, on_scar=False) for h in g.hotspots))
            for g in gs
        ]
    before = classify_season(gs, chance, n)
    after = classify_season(stripped, chance, n)
    assert after.risen_count == 0
    assert all(State.RISEN not in r.states for r in after.graves)
    assert [r.melt_day for r in after.graves] == [r.melt_day for r in before.graves]


@given(grave_and_length(), st.integers(min_value=0, max_value=30))
def test_property_5_time_shift(gn, k) -> None:
    """Property 5. Validates: Requirements 2.1, 2.5, 3.1."""
    g, n = gn
    shifted = dataclasses.replace(
        g,
        snow=(None,) * k + g.snow,
        hotspots=tuple(dataclasses.replace(h, day=h.day + k) for h in g.hotspots),
    )
    a = classify_grave(g, n)
    b = classify_grave(shifted, n + k)
    assert b.melt_day == (None if a.melt_day is None else a.melt_day + k)
    if a.rise is None:
        assert b.rise is None
    else:
        assert b.rise == dataclasses.replace(a.rise, day=a.rise.day + k)


# --- 6.4 ---------------------------------------------------------------------------------------


@given(season_lengths.flatmap(snow_series))
def test_property_6_melt_is_first_qualifying_day(snow) -> None:
    """Property 6. Validates: Requirements 2.1–2.4."""
    m = melt_day(snow)
    qualifying = [d for d in range(len(snow)) if melt_qualifies(snow, d)]
    assert m == (qualifying[0] if qualifying else None)


@given(season_lengths.flatmap(snow_series))
def test_property_7_threshold_is_strict(snow) -> None:
    """Property 7. Validates: Requirements 2.3, 2.4."""
    n = len(snow)
    assert melt_day(tuple(None if v is None else 0.15 for v in snow)) is None
    assert melt_day((0.0,) * n) == (0 if n >= 3 else None)


@st.composite
def unmelted_series_and_edit(draw):
    n = draw(season_lengths)
    snow = draw(snow_series(n))
    i = draw(st.integers(min_value=0, max_value=n - 1))
    snowy = draw(st.floats(min_value=0.15, max_value=1.0))
    return snow, i, snowy


@given(unmelted_series_and_edit())
def test_property_8_missing_data_never_creates_a_melt(case) -> None:
    """Property 8. Validates: Requirement 2.5."""
    snow, i, snowy = case
    if melt_day(snow) is not None:
        return
    edited = list(snow)
    if snow[i] is None:
        edited[i] = snowy  # missing -> snow
    elif snow[i] < 0.15:
        edited[i] = None  # snow-free -> missing
    else:
        return  # snowy -> missing may legitimately create a melt (design.md, Property 8)
    assert melt_day(tuple(edited)) is None


# --- 6.5 ---------------------------------------------------------------------------------------


@given(grave_and_length().flatmap(lambda gn: st.tuples(st.just(gn), st.permutations(gn[0].hotspots))))
def test_property_9_hotspot_order_does_not_matter(case) -> None:
    """Property 9. Validates: Requirement 3.7."""
    (g, n), perm = case
    assert classify_grave(dataclasses.replace(g, hotspots=tuple(perm)), n) == classify_grave(g, n)


@given(grave_and_length(), st.data())
def test_property_10_inert_hotspots(gn, data) -> None:
    """Property 10. Validates: Requirements 3.3–3.5, 3.8."""
    g, n = gn
    base = classify_grave(g, n)
    m = base.melt_day
    # Random days rarely hit the window edges, so also aim at melt - 1 and melt + 51.
    edges = [] if m is None else [d for d in (m - 1, m + 51) if 0 <= d < n]
    days = st.integers(min_value=0, max_value=n - 1)
    if edges:
        days = st.one_of(days, st.sampled_from(edges))
    extra = data.draw(
        st.lists(
            st.builds(Hotspot, day=days, x=st.floats(0.0, 1060.0), y=st.floats(0.0, 716.0), on_scar=st.booleans()),
            max_size=8,
        )
    )

    def inert(h: Hotspot) -> bool:
        return m is None or not h.on_scar or h.day < m or h.day > m + 50

    added = [h for h in extra if inert(h)]
    r = classify_grave(dataclasses.replace(g, hotspots=g.hotspots + tuple(added)), n)
    assert r.rise == base.rise
    pre_melt_on_scar = 0 if m is None else sum(1 for h in added if h.on_scar and h.day < m)
    assert r.early_hits == base.early_hits + pre_melt_on_scar


@given(grave_and_length())
def test_property_11_laid_to_rest_only_after_window(gn) -> None:
    """Property 11. Validates: Requirements 4.3, 4.6."""
    g, n = gn
    g = dataclasses.replace(g, hotspots=tuple(dataclasses.replace(h, on_scar=False) for h in g.hotspots))
    r = classify_grave(g, n)
    assert r.rise is None
    m = r.melt_day
    for d, s in enumerate(r.states):
        assert (s == State.LAID_TO_REST) == (m is not None and d > m + 50)
    if m is not None and m + 50 >= n - 1:
        assert r.states[-1] == State.WAKING


# --- 6.6 ---------------------------------------------------------------------------------------


@given(seasons())
def test_property_12_season_summary_agrees_with_graves(season) -> None:
    """Property 12. Validates: Requirements 5.1–5.3, 5.5."""
    gs, chance, n = season
    s = classify_season(gs, chance, n)
    assert s.risen_count == sum(1 for r in s.graves if r.rise is not None)
    assert s.chance == chance
    assert s.zombie_year == (s.risen_count / len(gs) > 1.4 * chance)
    assert [r.id for r in s.graves] == [g.id for g in gs]
    assert s.season_length == n


@st.composite
def zombie_case(draw):
    g = draw(st.integers(min_value=1, max_value=50))
    r = draw(st.integers(min_value=0, max_value=g - 1))
    c = draw(st.floats(min_value=0.0, max_value=1.0))
    c2 = draw(st.floats(min_value=0.0, max_value=c))
    return r, g, c, c2


@given(zombie_case())
def test_property_13_zombie_flag_is_monotone(case) -> None:
    """Property 13. Validates: Requirement 5.3."""
    r, g, c, c2 = case
    if is_zombie_year(r, g, c):
        assert is_zombie_year(r + 1, g, c)
        assert is_zombie_year(r, g, c2)


@given(seasons())
def test_property_14_pure_and_deterministic(season) -> None:
    """Property 14. Validates: Requirements 1.9, 4.5, 4.7."""
    gs, chance, n = season
    snapshot = copy.deepcopy(gs)
    a = classify_season(gs, chance, n)
    b = classify_season(gs, chance, n)
    assert a == b
    assert gs == snapshot
    for r in a.graves:
        assert len(r.states) == len(r.days_since_melt) == n
        for d, since in enumerate(r.days_since_melt):
            assert since == (None if r.melt_day is None or d < r.melt_day else d - r.melt_day)


def test_strategies_reach_every_state() -> None:
    """Guard against vacuous properties: the generators must produce melts, risings and rests."""
    from hypothesis import find, settings

    quick = settings(max_examples=2000, database=None)
    for state in (State.WAKING, State.RISEN, State.LAID_TO_REST):
        find(grave_and_length(), lambda gn, s=state: s in classify_grave(*gn).states, settings=quick)
