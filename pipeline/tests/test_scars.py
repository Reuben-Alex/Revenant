"""Scars, hulls and proximity (Requirements 3.2–3.5, 4.1–4.3), including Property 5."""

from datetime import date

import numpy as np
import shapely
from hypothesis import given
from hypothesis import strategies as st
from shapely.geometry import Point as SPoint
from shapely.geometry import box

from pipeline.grid import grid_to_lonlat, lonlat_to_grid, reproject, to_3978
from pipeline.hulls import component_polygon, components, dilate, hull_scars, rasterise_points
from pipeline.nbac import NbacFire
from pipeline.points import Point
from pipeline.proximity import on_scar, scar_hotspots, season_day
from pipeline.rules import Hotspot
from pipeline.scars import build_scar, rank, rasterise, scars_from_nbac, top_graves, union_mask


def grid_box_3978(x0, y0, x1, y1):
    """A polygon covering grid x in [x0, x1], y in [y0, y1], in EPSG:3978."""
    lon0, lat1 = grid_to_lonlat(x0, y0)
    lon1, lat0 = grid_to_lonlat(x1, y1)
    return reproject(shapely.segmentize(box(float(lon0), float(lat0), float(lon1), float(lat1)), 0.005), to_3978())


def pt_at(x, y, d=date(2024, 4, 20)):
    lon, lat = grid_to_lonlat(x, y)
    return Point(d, 1000, float(lat), float(lon), "VIIRS_SNPP_SP", "N", "n", 0, float(x), float(y))


# --- scars -------------------------------------------------------------------------------------

def test_mask_is_pixel_centres_inside() -> None:
    # covers centres x 100.5..102.5, y 200.5..201.5; centroid ~ (101.2, 201.2), away from a .5 boundary
    s = build_scar(2023, "nbac", grid_box_3978(99.6, 200.4, 102.8, 202.0))
    rows, cols = np.nonzero(s.mask)
    assert s.size_px == 6 and set(zip(rows, cols)) == {(r, c) for r in (200, 201) for c in (100, 101, 102)}
    assert (s.cx, s.cy) == (101, 201)  # nearest integer grid position (design.md, Data Models)


def test_sub_pixel_scar_has_no_pixels() -> None:
    assert build_scar(2023, "nbac", grid_box_3978(10.6, 10.6, 10.9, 10.9)).size_px == 0


def test_rank_and_top_graves() -> None:
    fires = [NbacFire(2023, {"id": i}, grid_box_3978(10 * i, 10, 10 * i + w, 10 + w)) for i, w in enumerate([2, 5, 3, 1])]
    scars = scars_from_nbac(fires)
    assert [s.size_px for s in scars] == sorted((s.size_px for s in scars), reverse=True)
    assert rank(reversed(scars)) == scars
    assert top_graves(scars, 2) == scars[:2]
    assert union_mask(scars).sum() == sum(s.size_px for s in scars)


def test_rasterise_edge_of_grid() -> None:
    m = rasterise(grid_box_3978(1058.0, 714.0, 1060.0, 716.0))
    assert m.sum() == 4 and m[715, 1059]


# --- hulls -------------------------------------------------------------------------------------

def test_dilate_is_a_radius_2_disc() -> None:
    m = np.zeros((716, 1060), dtype=bool)
    m[100, 100] = True
    d = dilate(m, 2)
    assert d.sum() == 13  # dx² + dy² <= 4
    assert d[98, 100] and d[101, 101] and not d[98, 101]


def test_dilate_at_grid_edge() -> None:
    m = np.zeros((716, 1060), dtype=bool)
    m[0, 0] = True
    assert dilate(m, 2).sum() == 6


def test_components_are_4_connected() -> None:
    m = np.zeros((716, 1060), dtype=bool)
    m[10, 10] = m[11, 11] = True  # diagonal only: two components
    m[20, 20] = m[20, 21] = True  # side by side: one
    assert sorted(c.sum() for c in components(m)) == [1, 1, 2]


def test_hull_polygon_mask_equals_component() -> None:
    m = np.zeros((716, 1060), dtype=bool)
    m[300:305, 400:410] = True
    m[305, 400:403] = True
    m[303, 412] = True  # a separate one-pixel component
    for comp in components(m):
        assert np.array_equal(rasterise(component_polygon(comp)), comp)


def test_hull_scars_from_points() -> None:
    pts = [pt_at(500.5, 300.5), pt_at(501.5, 300.5), pt_at(700.5, 100.5)]
    scars = hull_scars(pts, 2026)
    assert [s.origin for s in scars] == ["hull", "hull"]
    assert scars[0].size_px > scars[1].size_px == 13
    assert np.array_equal(union_mask(scars), dilate(rasterise_points(pts), 2))


# --- proximity ---------------------------------------------------------------------------------

def metres_east_of_edge(scar_poly, metres: float) -> Point:
    """A FIRMS point `metres` east of the scar's east edge (EPSG:3978 metres), mid-height."""
    from pipeline.grid import from_3978

    x0, y0, x1, y1 = scar_poly.bounds
    lon, lat = from_3978().transform(x1 + metres, (y0 + y1) / 2)
    gx, gy = lonlat_to_grid(lon, lat)
    return Point(date(2024, 4, 20), 1000, float(lat), float(lon), "VIIRS_SNPP_SP", "N", "n", 0, float(gx), float(gy))


def test_on_scar_inside_and_near_and_far() -> None:
    poly = box(-1_300_000, 1_100_000, -1_290_000, 1_110_000)  # 10 km square in EPSG:3978
    s = build_scar(2023, "nbac", poly)
    inside = metres_east_of_edge(poly, -5000)
    near, far = metres_east_of_edge(poly, 990), metres_east_of_edge(poly, 1010)
    assert on_scar([inside, near, far], s) == [True, True, False]


def test_scar_hotspots_days_and_window() -> None:
    poly = box(-1_300_000, 1_100_000, -1_290_000, 1_110_000)
    s = build_scar(2023, "nbac", poly)
    p = metres_east_of_edge(poly, -5000)
    mk = lambda d: Point(d, p.acq_time, p.lat, p.lon, p.source, p.satellite, p.confidence, p.type, p.x, p.y)
    pts = [mk(date(2024, 3, 20)), mk(date(2024, 3, 21)), mk(date(2024, 7, 1)), mk(date(2024, 7, 2)),
           metres_east_of_edge(poly, 5000)]
    hs = scar_hotspots(pts, s, 2024)
    assert hs == (Hotspot(0, p.x, p.y, True), Hotspot(102, p.x, p.y, True))
    assert season_day(date(2024, 7, 1), 2024) == 102


# Property 5 ----------------------------------------------------------------------------------

@given(
    st.floats(-1_500_000, -500_000), st.floats(700_000, 1_600_000),  # polygon origin (EPSG:3978)
    st.floats(200, 20_000), st.floats(200, 20_000),                   # polygon size
    st.floats(0, 1),                                                  # where on the boundary
    st.floats(-1_500, 1_500), st.floats(-1_500, 1_500),               # offset from that boundary point
)
def test_property_5_proximity_agrees_with_distance(x0, y0, w, h, along, dx, dy) -> None:
    """Property 5. Validates: Requirements 4.2.

    Points are placed within 1.5 km of a boundary point, so many land near the 1000 m threshold.
    """
    from pipeline.grid import from_3978

    poly = shapely.Polygon([(x0, y0), (x0 + w, y0), (x0 + w * 0.6, y0 + h), (x0, y0 + h * 0.4)])
    b = poly.exterior.interpolate(along, normalized=True)
    lon, lat = from_3978().transform(b.x + dx, b.y + dy)
    gx, gy = lonlat_to_grid(lon, lat)
    p = Point(date(2024, 4, 20), 1000, float(lat), float(lon), "VIIRS_SNPP_SP", "N", "n", 0, float(gx), float(gy))
    s = build_scar(2023, "nbac", poly)
    px, py = to_3978().transform(p.lon, p.lat)  # round trip of the point through lat/lon
    dist = poly.distance(SPoint(px, py))
    if abs(dist - 1000) < 1e-3:
        return  # too close to the threshold for the lat/lon round trip
    assert on_scar([p], s) == [dist <= 1000]
    if poly.contains(SPoint(px, py)):
        assert on_scar([p], s) == [True]
