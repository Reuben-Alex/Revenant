"""Example tests for melt_day (Requirements 2.1–2.5)."""

from pipeline.rules.melt import melt_day

S = 0.5  # clearly snowy
F = 0.1  # clearly snow-free
_ = None  # missing


def test_first_qualifying_day_is_returned() -> None:  # 2.1
    assert melt_day([S, S, F, F, F, F, F, F, F]) == 2


def test_exactly_0_15_is_snow() -> None:  # 2.3
    assert melt_day([0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15]) is None
    # 0.15 inside an otherwise snow-free window blocks it too
    assert melt_day([F, F, 0.15, F, F, F, F]) == 3
    # just under the threshold counts as snow-free
    assert melt_day([0.149, 0.149, 0.149]) == 0


def test_two_valid_days_is_not_enough_three_is() -> None:  # 2.1, 2.5
    assert melt_day([F, _, _, _, _, _, F, S]) is None  # window 0..6 has 2 valid
    assert melt_day([F, _, _, F, _, _, F, S]) == 0  # window 0..6 has 3 valid


def test_missing_start_day_is_skipped() -> None:  # 2.1
    # day 0 is missing; a window starting there would hold 3 snow-free values, but d must be valid
    assert melt_day([_, F, F, F]) == 1


def test_snowy_start_day_is_skipped() -> None:  # 2.1
    assert melt_day([S, F, F, F]) == 1


def test_window_is_cut_at_series_end() -> None:  # 2.2
    # day 4 starts a window of days 4..6 only (series ends): 3 valid, all snow-free
    assert melt_day([S, S, S, S, F, F, F]) == 4
    # only 2 days left after the last snowy day: not enough
    assert melt_day([S, S, S, S, S, F, F]) is None


def test_all_missing_gives_none() -> None:  # 2.4, 2.5
    assert melt_day([_] * 10) is None
    assert melt_day([]) is None


def test_snowy_day_inside_window_blocks_it() -> None:  # 2.1
    # the snowy day 3 blocks windows starting at 0..3; day 4 starts the first clean window
    assert melt_day([F, F, F, S, F, F, F, F, F, F]) == 4


def test_missing_day_does_not_break_window() -> None:  # 2.5
    assert melt_day([F, _, F, _, F, S, S, S]) is None  # window 0..6 holds a snowy day 5
    assert melt_day([F, _, F, _, F, _, _, S]) == 0  # window 0..6: 3 valid, all snow-free
