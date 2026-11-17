"""Grid and projection tests (Requirement 3.1), including Property 1: Grid round trip."""

import math

from hypothesis import given
from hypothesis import strategies as st

from pipeline.grid import from_3978, grid_to_lonlat, in_bbox, lonlat_to_grid, to_3978

lons = st.floats(min_value=-126.0, max_value=-109.0)
lats = st.floats(min_value=54.0, max_value=60.0)


@given(lons, lats)
def test_property_1_grid_round_trip(lon: float, lat: float) -> None:
    """Property 1. Validates: Requirements 3.1."""
    x, y = lonlat_to_grid(lon, lat)
    assert 0.0 <= x <= 1060.0 and 0.0 <= y <= 716.0
    lon2, lat2 = grid_to_lonlat(x, y)
    assert abs(lon2 - lon) <= 1e-9 and abs(lat2 - lat) <= 1e-9


def test_corners_and_border() -> None:
    assert tuple(map(float, lonlat_to_grid(-126.0, 60.0))) == (0.0, 0.0)
    assert tuple(map(float, lonlat_to_grid(-109.0, 54.0))) == (1060.0, 716.0)
    x, _ = lonlat_to_grid(-120.0, 57.0)  # BC/AB border, x = 374 in docs/method.md
    assert round(float(x)) == 374


def test_arrays() -> None:
    x, y = lonlat_to_grid([-126.0, -109.0], [60.0, 54.0])
    assert x.tolist() == [0.0, 1060.0] and y.tolist() == [0.0, 716.0]


def test_in_bbox() -> None:
    assert in_bbox([-126.0, -109.0, -117.5, -126.01, -100.0], [54.0, 60.0, 57.0, 57.0, 57.0]).tolist() == [
        True, True, True, False, False]


def test_epsg_3978_distances_are_map_metres() -> None:
    # 0.01° of latitude is ~1113 m on the ground at 57° N. EPSG:3978 (Lambert conformal, standard parallels
    # 49° and 77° N) shrinks distances here: scale ~0.977, so the same step measures ~1088 map metres.
    x1, y1 = to_3978().transform(-118.0, 57.0)
    x2, y2 = to_3978().transform(-118.0, 57.01)
    map_m = math.hypot(x2 - x1, y2 - y1)
    assert 1080 < map_m < 1095
    assert 0.97 < map_m / 1113.0 < 0.985
    lon, lat = from_3978().transform(x1, y1)
    assert abs(lon + 118.0) < 1e-9 and abs(lat - 57.0) < 1e-9
