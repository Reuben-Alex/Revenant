"""Input checks (Requirements 1.4–1.8, 5.4). Raise ValueError; never repair or drop bad input."""

import math
from collections.abc import Sequence

from .types import GraveInput


def validate_grave(g: GraveInput, season_length: int) -> None:
    """Check one grave's snow series and hotspots against the season length."""
    if len(g.snow) != season_length:
        raise ValueError(
            f"grave {g.id}: snow series has {len(g.snow)} days, season has {season_length}"
        )
    for day, v in enumerate(g.snow):
        if v is None:
            continue
        if not math.isfinite(v) or not 0.0 <= v <= 1.0:
            raise ValueError(f"grave {g.id}, day {day}: snow value {v!r} is not in [0, 1]")
    for h in g.hotspots:
        if not 0 <= h.day <= season_length - 1:
            raise ValueError(
                f"grave {g.id}, day {h.day}: hotspot day is outside [0, {season_length - 1}]"
            )


def validate_chance(chance: float) -> None:
    """Check the chance baseline is a number in [0, 1]. NaN fails both comparisons."""
    if not 0.0 <= chance <= 1.0:
        raise ValueError(f"chance baseline {chance!r} is not in [0, 1]")


def validate_season(graves: Sequence[GraveInput], chance: float, season_length: int) -> None:
    """Check a whole season: at least one grave, unique ids, valid chance, and each grave."""
    if len(graves) == 0:
        raise ValueError("season has no graves")
    seen: set[str] = set()
    for g in graves:
        if g.id in seen:
            raise ValueError(f"grave id {g.id} appears more than once")
        seen.add(g.id)
    validate_chance(chance)
    for g in graves:
        validate_grave(g, season_length)
