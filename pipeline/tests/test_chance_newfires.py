"""Chance baseline and new fires (Requirements 6.1–6.3, 7.1–7.3), including Properties 7 and 8."""

from datetime import date, timedelta

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from pipeline.chance import ChanceUndefined, chance_rate, shift_lonlat, simulate
from pipeline.grid import bbox_lonlat, from_3978, reproject
from pipeline.newfires import footprint, new_fire_points, new_fires, pixel_of
from pipeline.scars import build_scar
from pipeline.tests.geo import grid_box_3978, pt_at

YEAR = 2024
D0 = date(YEAR, 3, 21)


def scar(x, y, w=6, h=6):
    return build_scar(YEAR - 1, "nbac", grid_box_3978(x, y, x + w, y + h))


def rng(seed=YEAR):
    return np.random.default_rng(seed)


# --- chance ------------------------------------------------------------------------------------

def test_no_points_no_hits() -> None:
    graves = [scar(500, 350)]
    r = simulate(graves, [10], [], graves, YEAR, rng())
    assert r.accepted == 30 and r.hits == 0 and r.rate == 0.0


def test_heat_everywhere_every_offset_hits() -> None:
    graves = [scar(500, 350)]
    pts = [pt_at(x + 0.5, y + 0.5, D0 + timedelta(days=20)) for x in range(0, 1060, 3) for y in range(0, 716, 3)]
    r = simulate(graves, [10], pts, graves, YEAR, rng())
    assert r.accepted == 30 and r.rate == 1.0


def test_heat_outside_the_window_never_hits() -> None:
    graves = [scar(500, 350)]
    early = [pt_at(x + 0.5, y + 0.5, D0 + timedelta(days=5)) for x in range(0, 1060, 3) for y in range(0, 716, 3)]
    assert simulate(graves, [10], early, graves, YEAR, rng()).hits == 0  # all before melt day 10
    late = [pt_at(p.x, p.y, D0 + timedelta(days=61)) for p in early]
    assert simulate(graves, [10], late, graves, YEAR, rng()).hits == 0  # after melt + 50


def test_graves_without_melt_add_nothing_and_none_is_undefined() -> None:
    graves = [scar(300, 300), scar(600, 300)]
    r = simulate(graves, [None, 12], [], graves, YEAR, rng())
    assert {o.grave for o in r.offsets} == {1}
    with pytest.raises(ChanceUndefined):
        simulate(graves, [None, None], [], graves, YEAR, rng()).rate


def test_offsets_avoid_scars_and_stay_inside() -> None:
    # a grave boxed in by other scars: offsets must land on unburned ground inside the bbox
    graves = [scar(20, 20, 10, 10)]
    others = [scar(x, y, 30, 30) for x in range(0, 400, 60) for y in range(0, 300, 60)]
    r = simulate(graves, [5], [], graves + others, YEAR, rng())
    region = bbox_lonlat()
    blocks = [reproject(s.polygon_3978, from_3978()) for s in graves + others]
    for o in r.offsets:
        assert region.contains(o.polygon_lonlat)
        assert not any(o.polygon_lonlat.intersects(b) for b in blocks)
    assert r.accepted <= 30 and r.attempts <= 300


def test_chance_is_reproducible_and_seeded_by_year() -> None:
    graves = [scar(500, 350), scar(200, 200)]
    pts = [pt_at(x + 0.5, y + 0.5, D0 + timedelta(days=20)) for x in range(0, 1060, 40) for y in range(0, 716, 40)]
    a = chance_rate(graves, [10, 15], pts, graves, YEAR)
    assert a == chance_rate(graves, [10, 15], pts, graves, YEAR)
    assert a == simulate(graves, [10, 15], pts, graves, YEAR, np.random.default_rng(YEAR)).rate


def test_offset_ranges_are_200_by_150_px() -> None:
    graves = [scar(x, 358, 2, 2) for x in (300, 500, 700)]  # small graves mid-map: the bbox rarely rejects
    r = simulate(graves, [5, 5, 5], [], graves, YEAR, rng())
    dx = np.array([o.dx for o in r.offsets])
    dy = np.array([o.dy for o in r.offsets])
    assert r.accepted == 90
    assert np.abs(dx).max() <= 200 and np.abs(dy).max() <= 150
    # the full range is used in both directions (90 uniform draws make each of these near-certain)
    assert dx.min() < -180 and dx.max() > 180 and dy.min() < -135 and dy.max() > 135


def expected_hit(moved_lonlat, melt, pts) -> bool:
    """Independent oracle: any point within 1000 m (EPSG:3978) of the shifted shape, inside the window."""
    from pipeline.grid import to_3978

    import shapely

    moved = reproject(moved_lonlat, to_3978())
    hi = min(melt + 50, 102)
    inside = [p for p in pts if melt <= (p.acq_date - D0).days <= hi]
    if not inside:
        return False
    x, y = to_3978().transform([p.lon for p in inside], [p.lat for p in inside])
    return bool((shapely.distance(moved, shapely.points(x, y)) <= 1000).any())


def test_hits_match_an_independent_1_km_check() -> None:
    graves = [scar(300, 300, 4, 4), scar(700, 400, 3, 5)]
    g = np.random.default_rng(7)
    n = 8000
    pts = [pt_at(float(x), float(y), D0 + timedelta(days=int(d)))
           for x, y, d in zip(g.uniform(0, 1060, n), g.uniform(0, 716, n), g.integers(0, 103, n))]
    melts = [10, 30]
    r = simulate(graves, melts, pts, graves, YEAR, rng())
    assert 0 < r.hits < r.accepted  # the case is informative: some hit, some don't
    for o in r.offsets:
        assert o.hit == expected_hit(o.polygon_lonlat, melts[o.grave], pts)


def test_hits_at_the_1_km_boundary() -> None:
    """Offsets don't depend on the points (same seed, same draws), so points can be placed 980 m or
    1020 m east of each shifted shape and the hit checked against the oracle."""
    from pipeline.grid import from_3978, lonlat_to_grid, to_3978

    graves = [scar(400, 300, 3, 3)]
    offsets = simulate(graves, [10], [], graves, YEAR, rng()).offsets
    pts = []
    for k, o in enumerate(offsets):
        m = reproject(o.polygon_lonlat, to_3978())
        # Start at the easternmost vertex: +980 m east is at most 980 m from the shape, and +1020 m is
        # at least 1020 m, because no part of the shape lies further east.
        vx, vy = max(m.exterior.coords, key=lambda c: c[0])
        lon, lat = from_3978().transform(vx + (980 if k % 2 == 0 else 1020), vy)
        gx, gy = lonlat_to_grid(lon, lat)
        pts.append(pt_at(float(gx), float(gy), D0 + timedelta(days=20)))
    r = simulate(graves, [10], pts, graves, YEAR, rng())
    assert [o.dx for o in r.offsets] == [o.dx for o in offsets]
    assert 0 < r.hits < r.accepted
    for o in r.offsets:
        assert o.hit == expected_hit(o.polygon_lonlat, 10, pts)


def test_shift_moves_by_grid_pixels() -> None:
    s = reproject(scar(100, 100).polygon_3978, from_3978())
    moved = shift_lonlat(s, 10, -5)  # 10 px east, 5 px north
    assert abs((moved.bounds[0] - s.bounds[0]) - 10 * 17 / 1060) < 1e-9
    assert abs((moved.bounds[1] - s.bounds[1]) - 5 * 6 / 716) < 1e-9


@settings(max_examples=40)
@given(
    st.lists(st.tuples(st.integers(20, 1000), st.integers(20, 660), st.integers(2, 25), st.integers(2, 25)),
             min_size=1, max_size=3),
    st.lists(st.tuples(st.floats(0, 1059), st.floats(0, 715), st.integers(-5, 110)), max_size=60),
    st.lists(st.one_of(st.none(), st.integers(0, 102)), min_size=3, max_size=3),
    st.integers(0, 2**32 - 1),
)
def test_property_7_chance_is_a_reproducible_rate(boxes, raw_pts, melts, seed) -> None:
    """Property 7. Validates: Requirements 6.1, 6.2, 6.3."""
    graves = [scar(x, y, w, h) for x, y, w, h in boxes]
    melts = melts[: len(graves)]
    pts = [pt_at(x, y, D0 + timedelta(days=d)) for x, y, d in raw_pts]
    a = simulate(graves, melts, pts, graves, YEAR, np.random.default_rng(seed))
    b = simulate(graves, melts, pts, graves, YEAR, np.random.default_rng(seed))
    assert a == b
    if a.accepted:
        assert 0.0 <= a.rate <= 1.0
    else:
        assert all(m is None for m in melts) or a.attempts > 0
    region = bbox_lonlat()
    blocks = [reproject(g.polygon_3978, from_3978()) for g in graves]
    per_grave = {}
    for o in a.offsets:
        per_grave[o.grave] = per_grave.get(o.grave, 0) + 1
        assert melts[o.grave] is not None
        assert abs(o.dx) <= 200 and abs(o.dy) <= 150
        assert o.hit == expected_hit(o.polygon_lonlat, melts[o.grave], pts)
        assert region.contains(o.polygon_lonlat) and not any(o.polygon_lonlat.intersects(bk) for bk in blocks)
    assert all(n <= 30 for n in per_grave.values())


# --- new fires ---------------------------------------------------------------------------------

def test_fifteen_px_rule() -> None:
    s = scar(500, 350, 1, 1)  # one pixel: (row 350, col 500)
    assert s.size_px == 1
    d = D0 + timedelta(days=30)
    at15 = pt_at(515.5, 350.5, d)  # pixel centre exactly 15 px away: not a new fire
    at16 = pt_at(516.5, 350.5, d)
    diag = pt_at(511.5, 361.5, d)  # 11² + 11² = 242 > 225: new fire
    got = [p for p, _ in new_fire_points([at15, at16, diag], [s], YEAR)]
    assert got == [at16, diag]


def test_only_spring_days_count() -> None:
    s = scar(100, 100, 1, 1)
    pts = [pt_at(800.5, 500.5, D0 + timedelta(days=k)) for k in (-1, 0, 102, 103)]
    assert [d for _, d in new_fire_points(pts, [s], YEAR)] == [0, 102]


def test_clusters_mean_first_day_and_count() -> None:
    s = scar(10, 10, 1, 1)
    pts = [pt_at(600.5, 400.5, D0 + timedelta(days=40)), pt_at(604.5, 400.5, D0 + timedelta(days=33)),  # 4 px: joined
           pt_at(700.5, 400.5, D0 + timedelta(days=50))]
    fires = new_fires(pts, [s], YEAR)
    assert [(f.n_points, f.first_day) for f in fires] == [(2, 33), (1, 50)]
    assert (fires[0].x, fires[0].y) == (602.5, 400.5)


def test_keeps_24_largest() -> None:
    s = scar(5, 5, 1, 1)
    pts = []
    for k in range(30):
        x, y = 100 + 30 * (k % 10), 200 + 60 * (k // 10)
        pts += [pt_at(x + 0.5, y + 0.5, D0 + timedelta(days=k))] * (k + 1)
    fires = new_fires(pts, [s], YEAR)
    assert len(fires) == 24 and [f.n_points for f in fires] == list(range(30, 6, -1))


def test_sub_pixel_scar_still_blocks() -> None:
    tiny = scar(500.6, 350.6, 0.2, 0.2)
    assert tiny.size_px == 0 and footprint([tiny])[tiny.cy, tiny.cx]


@settings(max_examples=60)
@given(
    st.lists(st.tuples(st.integers(0, 1050), st.integers(0, 706), st.integers(1, 8), st.integers(1, 8)),
             min_size=1, max_size=4),
    st.lists(st.tuples(st.floats(0, 1059.9), st.floats(0, 715.9), st.integers(-3, 105)), max_size=80),
)
def test_property_8_new_fires_are_far_from_scars(boxes, raw_pts) -> None:
    """Property 8. Validates: Requirements 7.1, 7.2."""
    scars = [scar(x, y, w, h) for x, y, w, h in boxes]
    fp = np.argwhere(footprint(scars))  # (row, col) of scar pixels
    pts = [pt_at(x, y, D0 + timedelta(days=d)) for x, y, d in raw_pts]
    for f in new_fires(pts, scars, YEAR):
        assert f.first_day == min((p.acq_date - D0).days for p in f.points)
        for p in f.points:
            r, c = pixel_of(p)
            assert ((fp[:, 0] - r) ** 2 + (fp[:, 1] - c) ** 2).min() > 15 ** 2
