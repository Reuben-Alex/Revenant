"""Input checks (Requirements 1.4–1.8, 1.10–1.13, 5.4). Raise ValueError; never repair or drop bad input.

Type checks run before range checks. `bool` is rejected wherever a number is expected,
because Python treats True/False as the ints 1/0.
"""

import math
from collections.abc import Sequence

from .types import GraveInput


def _is_real(v: object) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _is_int(v: object) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def validate_season_length(season_length: int) -> None:
    """Requirement 1.13: season length is an int of at least 1."""
    if not _is_int(season_length) or season_length < 1:
        raise ValueError(f"season length {season_length!r} is not an int >= 1")


def validate_grave(g: GraveInput, season_length: int) -> None:
    """Check one grave's snow series and hotspots against the season length."""
    validate_season_length(season_length)
    if len(g.snow) != season_length:
        raise ValueError(
            f"grave {g.id}: snow series has {len(g.snow)} days, season has {season_length}"
        )
    for day, v in enumerate(g.snow):
        if v is None:
            continue
        if not _is_real(v):
            raise ValueError(f"grave {g.id}, day {day}: snow value {v!r} is not a number")
        if not math.isfinite(v) or not 0.0 <= v <= 1.0:
            raise ValueError(f"grave {g.id}, day {day}: snow value {v!r} is not in [0, 1]")
    for h in g.hotspots:
        if not _is_int(h.day):
            raise ValueError(f"grave {g.id}: hotspot day {h.day!r} is not an int")
        if not 0 <= h.day <= season_length - 1:
            raise ValueError(
                f"grave {g.id}, day {h.day}: hotspot day is outside [0, {season_length - 1}]"
            )
        for name, c in (("x", h.x), ("y", h.y)):
            if not _is_real(c) or not math.isfinite(c):
                raise ValueError(
                    f"grave {g.id}, day {h.day}: hotspot {name} {c!r} is not a finite number"
                )


def validate_chance(chance: float) -> None:
    """Check the chance baseline is a number in [0, 1]. NaN fails both comparisons."""
    if not 0.0 <= chance <= 1.0:
        raise ValueError(f"chance baseline {chance!r} is not in [0, 1]")


def validate_season(graves: Sequence[GraveInput], chance: float, season_length: int) -> None:
    """Check a whole season: valid length, at least one grave, unique ids, valid chance, and each grave."""
    validate_season_length(season_length)
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
