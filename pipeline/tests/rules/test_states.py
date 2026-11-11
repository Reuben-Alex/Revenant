"""Example tests for daily state and days-since-melt (Requirements 4.1–4.7)."""

from pipeline.rules.states import state_on, timeline
from pipeline.rules.types import Rise, State

B, W, R, L = State.BURIED, State.WAKING, State.RISEN, State.LAID_TO_REST


def test_buried_then_risen_on_melt_day() -> None:  # 4.1, 4.2
    states, since = timeline(melt=3, rise=Rise(3, 0.0, 0.0), season_length=6)
    assert states == (B, B, B, R, R, R)  # no Waking day
    assert since == (None, None, None, 0, 1, 2)


def test_waking_then_risen() -> None:  # 4.2, 4.4
    states, _ = timeline(melt=1, rise=Rise(3, 0.0, 0.0), season_length=5)
    assert states == (B, W, W, R, R)


def test_laid_to_rest_from_melt_plus_51() -> None:  # 4.3
    assert state_on(70, melt=20, rise=None) == W  # melt + 50: window still open
    assert state_on(71, melt=20, rise=None) == L  # melt + 51
    states, since = timeline(melt=20, rise=None, season_length=103)
    assert states[:20] == (B,) * 20
    assert states[20:71] == (W,) * 51
    assert states[71:] == (L,) * 32
    assert since[71] == 51


def test_risen_grave_is_never_laid_to_rest() -> None:  # 4.2 before 4.3
    assert state_on(100, melt=20, rise=Rise(40, 0.0, 0.0)) == R


def test_window_open_at_series_end_stays_waking() -> None:  # 4.6
    states, since = timeline(melt=54, rise=None, season_length=103)  # melt + 50 = 104 > 102
    assert states[-1] == W
    assert L not in states
    assert since[-1] == 48


def test_never_melting_grave_is_buried_all_season() -> None:  # 4.1, 4.5
    states, since = timeline(melt=None, rise=None, season_length=103)
    assert states == (B,) * 103
    assert since == (None,) * 103


def test_one_entry_per_season_day() -> None:  # 4.7
    for n in (1, 7, 103):
        states, since = timeline(melt=0, rise=None, season_length=n)
        assert len(states) == len(since) == n
