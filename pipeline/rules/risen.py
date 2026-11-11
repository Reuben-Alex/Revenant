"""Rising and early hits (Requirement 3; design.md "Algorithms")."""

import math
from collections.abc import Iterable

from .constants import RISE_WINDOW_DAYS
from .types import Hotspot, Rise


def find_rise(hotspots: Iterable[Hotspot], melt: int | None, season_length: int) -> Rise | None:
    """Return the first on-scar hotspot day in [melt, min(melt + 50, season_length - 1)], or None.

    The location is the mean x and mean y of every on-scar hotspot on that day. `math.fsum`
    is exactly rounded, so the result does not depend on hotspot order. Expects validated input.
    """
    if melt is None:
        return None
    hi = min(melt + RISE_WINDOW_DAYS, season_length - 1)
    hits = [h for h in hotspots if h.on_scar and melt <= h.day <= hi]
    if not hits:
        return None
    day = min(h.day for h in hits)
    on_day = [h for h in hits if h.day == day]
    n = len(on_day)
    return Rise(
        day=day,
        x=math.fsum(h.x for h in on_day) / n,
        y=math.fsum(h.y for h in on_day) / n,
    )


def early_hits(hotspots: Iterable[Hotspot], melt: int | None) -> int:
    """Count on-scar hotspots dated before the melt day (display only; 0 when melt is None)."""
    if melt is None:
        return 0
    return sum(1 for h in hotspots if h.on_scar and h.day < melt)
