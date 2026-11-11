"""Example tests for find_rise and early_hits (Requirements 3.1–3.8)."""

from pipeline.rules.risen import early_hits, find_rise
from pipeline.rules.types import Hotspot, Rise

N = 103  # research season length (Mar 21 + 0..102)


def on(day: int, x: float = 10.0, y: float = 20.0) -> Hotspot:
    return Hotspot(day=day, x=x, y=y, on_scar=True)


def off(day: int, x: float = 10.0, y: float = 20.0) -> Hotspot:
    return Hotspot(day=day, x=x, y=y, on_scar=False)


def test_rise_on_melt_day() -> None:  # 3.1: window is inclusive at melt
    assert find_rise([on(18)], melt=18, season_length=N) == Rise(18, 10.0, 20.0)


def test_rise_at_melt_plus_50_but_not_51() -> None:  # 3.1, 3.4
    assert find_rise([on(70)], melt=20, season_length=N) == Rise(70, 10.0, 20.0)
    assert find_rise([on(71)], melt=20, season_length=N) is None


def test_earliest_day_in_window_wins() -> None:  # 3.1
    hs = [on(40, x=1.0, y=1.0), on(25, x=2.0, y=2.0), on(60, x=3.0, y=3.0)]
    assert find_rise(hs, melt=20, season_length=N) == Rise(25, 2.0, 2.0)


def test_window_cut_at_season_end() -> None:  # 3.1: melt + 50 runs past day 102
    assert find_rise([on(102)], melt=60, season_length=N) == Rise(102, 10.0, 20.0)


def test_pre_melt_hit_ignored_but_counted_as_early_hit() -> None:  # 3.3, 3.8
    hs = [on(5), on(9), off(7)]
    assert find_rise(hs, melt=10, season_length=N) is None
    assert early_hits(hs, melt=10) == 2  # off-scar day-7 hit is not counted


def test_off_scar_hit_ignored() -> None:  # 3.5
    assert find_rise([off(30)], melt=20, season_length=N) is None
    # an off-scar hit on an earlier day doesn't move the rise day or the location
    assert find_rise([off(25, x=99.0), on(30)], melt=20, season_length=N) == Rise(30, 10.0, 20.0)


def test_two_hits_on_rise_day_are_averaged() -> None:  # 3.2
    hs = [on(30, x=100.0, y=200.0), on(30, x=104.0, y=210.0), on(31, x=0.0, y=0.0)]
    assert find_rise(hs, melt=20, season_length=N) == Rise(30, 102.0, 205.0)


def test_off_scar_hits_on_rise_day_are_not_averaged() -> None:  # 3.2, 3.5
    hs = [on(30, x=100.0, y=200.0), off(30, x=0.0, y=0.0)]
    assert find_rise(hs, melt=20, season_length=N) == Rise(30, 100.0, 200.0)


def test_no_melt_means_no_rise_and_no_early_hits() -> None:  # 3.6, 3.8
    assert find_rise([on(0), on(50)], melt=None, season_length=N) is None
    assert early_hits([on(0), on(50)], melt=None) == 0


def test_hotspot_order_does_not_matter() -> None:  # 3.7
    # Values whose naive left-to-right sum depends on order (1e16 + 1 + 1 vs 1 + 1 + 1e16).
    # math.fsum is exactly rounded, so the mean is the same for every order. Note: Python 3.12's
    # built-in sum() is also compensated, so this example doesn't by itself prove fsum is needed;
    # Property 9 (task 6.5) checks order independence over generated inputs.
    hs = [on(30, x=0.1, y=1e16), on(30, x=0.2, y=1.0), on(30, x=0.3, y=1.0), on(45)]
    expected = find_rise(hs, melt=20, season_length=N)
    assert find_rise(list(reversed(hs)), melt=20, season_length=N) == expected
    assert find_rise(hs[1:] + hs[:1], melt=20, season_length=N) == expected


def test_no_hotspots() -> None:
    assert find_rise([], melt=20, season_length=N) is None
    assert early_hits([], melt=20) == 0
