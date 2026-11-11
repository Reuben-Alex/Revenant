"""Per-grave classification and season summary (Requirement 5; design.md "Algorithms")."""

from collections.abc import Sequence

from .constants import ZOMBIE_FACTOR
from .melt import melt_day
from .risen import early_hits, find_rise
from .states import timeline
from .types import GraveInput, GraveResult, SeasonResult
from .validate import validate_grave, validate_season


def is_zombie_year(risen: int, graves: int, chance: float) -> bool:
    """True when risen / graves > 1.4 x chance (strict). Raises ValueError for zero graves."""
    if graves <= 0:
        raise ValueError("season has no graves")
    return risen / graves > ZOMBIE_FACTOR * chance


def _classify(g: GraveInput, season_length: int) -> GraveResult:
    melt = melt_day(g.snow)
    rise = find_rise(g.hotspots, melt, season_length)
    states, since = timeline(melt, rise, season_length)
    return GraveResult(
        id=g.id,
        melt_day=melt,
        rise=rise,
        early_hits=early_hits(g.hotspots, melt),
        states=states,
        days_since_melt=since,
    )


def classify_grave(g: GraveInput, season_length: int) -> GraveResult:
    """Validate one grave, then compute its melt day, rise, early hits and daily states."""
    validate_grave(g, season_length)
    return _classify(g, season_length)


def classify_season(
    graves: Sequence[GraveInput], chance: float, season_length: int
) -> SeasonResult:
    """Validate the season once, classify every grave in input order, and summarise."""
    validate_season(graves, chance, season_length)
    results = tuple(_classify(g, season_length) for g in graves)
    risen = sum(1 for r in results if r.rise is not None)
    return SeasonResult(
        graves=results,
        risen_count=risen,
        chance=chance,
        zombie_year=is_zombie_year(risen, len(results), chance),
        season_length=season_length,
    )
