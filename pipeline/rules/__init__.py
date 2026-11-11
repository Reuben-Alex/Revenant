"""Pure zombie-fire rule engine (see .kiro/specs/zombie-rule-engine/). No I/O."""

from .melt import melt_day
from .risen import early_hits, find_rise
from .season import classify_grave, classify_season, is_zombie_year
from .states import state_on, timeline
from .types import GraveInput, GraveResult, Hotspot, Rise, SeasonResult, State

__all__ = [
    "GraveInput",
    "GraveResult",
    "Hotspot",
    "Rise",
    "SeasonResult",
    "State",
    "classify_grave",
    "classify_season",
    "early_hits",
    "find_rise",
    "is_zombie_year",
    "melt_day",
    "state_on",
    "timeline",
]
