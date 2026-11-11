"""Melt day (Requirement 2; design.md "Algorithms")."""

from collections.abc import Sequence

from .constants import MELT_WINDOW_DAYS, MIN_VALID_OBS, SNOW_FREE_BELOW


def melt_day(snow: Sequence[float | None]) -> int | None:
    """Return the first season day d that starts a melt window, or None if no day does.

    d qualifies when snow[d] is valid, and the window d..d+6 (cut at the series end) holds
    at least 3 valid values, all strictly below 0.15. Missing values (None) neither count
    toward the 3 nor break the window. Expects validated input (see validate.py).
    """
    for d, start in enumerate(snow):
        if start is None or start >= SNOW_FREE_BELOW:
            continue
        valid = [v for v in snow[d : d + MELT_WINDOW_DAYS] if v is not None]
        if len(valid) >= MIN_VALID_OBS and all(v < SNOW_FREE_BELOW for v in valid):
            return d
    return None
