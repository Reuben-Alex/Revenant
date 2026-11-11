"""Data models for the rule engine (design.md, "Data Models")."""

from dataclasses import dataclass
from enum import Enum


class State(str, Enum):
    """A grave's display state on one season day. Values match the design board's `st` codes."""

    BURIED = "buried"
    WAKING = "waking"
    RISEN = "risen"
    LAID_TO_REST = "rest"


@dataclass(frozen=True)
class Hotspot:
    """A fire detection. `on_scar` (proximity to the prior-year scar) is decided upstream by the pipeline."""

    day: int
    x: float
    y: float
    on_scar: bool


@dataclass(frozen=True)
class GraveInput:
    """One prior-year burn scar. `snow` holds one fraction in [0, 1] per season day, or None when missing."""

    id: str
    size: int
    cx: float
    cy: float
    snow: tuple[float | None, ...]
    hotspots: tuple[Hotspot, ...] = ()


@dataclass(frozen=True)
class Rise:
    """Rise day and the mean position of that day's on-scar hotspots."""

    day: int
    x: float
    y: float


@dataclass(frozen=True)
class GraveResult:
    id: str
    melt_day: int | None
    rise: Rise | None
    early_hits: int
    states: tuple[State, ...]  # len == season length
    days_since_melt: tuple[int | None, ...]


@dataclass(frozen=True)
class SeasonResult:
    graves: tuple[GraveResult, ...]
    risen_count: int
    chance: float
    zombie_year: bool
    season_length: int
