"""One failing-input example per validation check (Requirements 1.4–1.8, 5.4)."""

import math

import pytest

from pipeline.rules.types import GraveInput, Hotspot
from pipeline.rules.validate import validate_chance, validate_grave, validate_season

N = 5  # season length used throughout


def grave(id: str = "G-01", snow=(0.5, 0.4, None, 0.1, 0.0), hotspots=()) -> GraveInput:
    return GraveInput(id=id, size=10, cx=1.0, cy=2.0, snow=tuple(snow), hotspots=tuple(hotspots))


def test_valid_season_passes() -> None:
    hs = (Hotspot(day=0, x=1.0, y=1.0, on_scar=True), Hotspot(day=N - 1, x=2.0, y=2.0, on_scar=False))
    validate_season([grave("G-01", hotspots=hs), grave("G-02")], chance=0.347, season_length=N)
    validate_chance(0.0)
    validate_chance(1.0)


# Requirement 1.4: NaN, infinite, or outside [0, 1] -> ValueError naming grave id and day.
@pytest.mark.parametrize("bad", [math.nan, math.inf, -math.inf, -0.01, 1.01])
def test_bad_snow_value_names_grave_and_day(bad: float) -> None:
    g = grave("G-07", snow=(0.5, 0.4, bad, 0.1, 0.0))
    with pytest.raises(ValueError, match=r"G-07.*day 2"):
        validate_grave(g, N)


# Requirement 1.5: snow series length differs from season length.
@pytest.mark.parametrize("snow", [(0.1,) * (N - 1), (0.1,) * (N + 1)])
def test_series_length_mismatch(snow) -> None:
    with pytest.raises(ValueError, match="G-01"):
        validate_grave(grave(snow=snow), N)


# Requirement 1.6: hotspot day outside [0, season length - 1].
@pytest.mark.parametrize("day", [-1, N])
def test_hotspot_day_out_of_range(day: int) -> None:
    g = grave("G-03", hotspots=[Hotspot(day=day, x=0.0, y=0.0, on_scar=True)])
    with pytest.raises(ValueError, match=rf"G-03.*day {day}"):
        validate_grave(g, N)


# Requirement 1.7: chance outside [0, 1] or NaN.
@pytest.mark.parametrize("chance", [-0.01, 1.01, math.nan, math.inf])
def test_bad_chance(chance: float) -> None:
    with pytest.raises(ValueError, match="chance"):
        validate_season([grave()], chance=chance, season_length=N)


# Requirement 1.8: two graves share an id.
def test_duplicate_grave_ids() -> None:
    with pytest.raises(ValueError, match="G-02"):
        validate_season([grave("G-02"), grave("G-02")], chance=0.2, season_length=N)


# Requirement 5.4: a season with zero graves.
def test_empty_season() -> None:
    with pytest.raises(ValueError, match="no graves"):
        validate_season([], chance=0.2, season_length=N)
