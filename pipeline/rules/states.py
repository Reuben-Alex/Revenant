"""Daily state (Requirement 4; design.md "Algorithms")."""

from .constants import RISE_WINDOW_DAYS
from .types import Rise, State


def state_on(day: int, melt: int | None, rise: Rise | None) -> State:
    """Buried before melt (or never melted); Risen from the rise day; LaidToRest after melt + 50; else Waking."""
    if melt is None or day < melt:
        return State.BURIED
    if rise is not None and day >= rise.day:
        return State.RISEN
    if day - melt > RISE_WINDOW_DAYS:
        return State.LAID_TO_REST
    return State.WAKING


def days_since_melt(day: int, melt: int | None) -> int | None:
    """d - melt from the melt day on, None before it (or when the grave never melts)."""
    if melt is None or day < melt:
        return None
    return day - melt


def timeline(
    melt: int | None, rise: Rise | None, season_length: int
) -> tuple[tuple[State, ...], tuple[int | None, ...]]:
    """State and days-since-melt for every season day 0..season_length - 1."""
    days = range(season_length)
    return (
        tuple(state_on(d, melt, rise) for d in days),
        tuple(days_since_melt(d, melt) for d in days),
    )
