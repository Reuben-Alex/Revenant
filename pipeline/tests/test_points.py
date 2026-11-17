"""Points: parse, dedupe, recurring cells, clean (Requirements 2.1–2.6), Properties 3 and 4."""

from collections import Counter
from datetime import date

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pipeline.grid import in_bbox, lonlat_to_grid
from pipeline.points import (
    Point,
    clean,
    clean_with_counts,
    dedupe,
    drop_reason,
    parse,
    recurring_cells,
    static_type_cells,
)

SP_CSV = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,type
55.7831,-116.35712,295.38,0.6,0.71,2024-05-10,835,N,VIIRS,n,2,280.5,1.26,N,0
57.0057,-111.47711,296.7,0.39,0.6,2024-05-10,835,N,VIIRS,h,2,280.4,1.11,N,2
57.1,-118.2,330.1,0.4,0.5,2024-05-10,2059,N,VIIRS,l,2,290.0,3.2,D,0
"""
NRT_CSV = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
58.2,-120.5,310.0,0.4,0.4,2026-11-09,1012,N20,VIIRS,n,2.0NRT,280.0,2.0,D
"""


def pt(lat=57.0, lon=-118.0, d=date(2024, 5, 10), t=835, source="VIIRS_SNPP_SP", conf="n", typ=0, sat="N"):
    x, y = lonlat_to_grid(lon, lat)
    return Point(d, t, lat, lon, source, sat, conf, typ, float(x), float(y))


# --- parse -------------------------------------------------------------------------------------

def test_parse_sp_rows() -> None:
    ps = parse(SP_CSV, "VIIRS_SNPP_SP")
    assert len(ps) == 3
    p = ps[0]
    assert (p.lat, p.lon, p.acq_date, p.acq_time, p.confidence, p.satellite, p.type) == (
        55.7831, -116.35712, date(2024, 5, 10), 835, "n", "N", 0)
    x, y = lonlat_to_grid(-116.35712, 55.7831)
    assert (p.x, p.y) == (float(x), float(y))
    assert [q.type for q in ps] == [0, 2, 0]


def test_parse_nrt_rows_have_no_type() -> None:
    (p,) = parse(NRT_CSV, "VIIRS_NOAA20_NRT")
    assert p.type is None and p.is_nrt and p.satellite == "N20"


def test_parse_header_only_gives_no_points() -> None:
    assert parse(SP_CSV.splitlines()[0] + "\n", "VIIRS_SNPP_SP") == []


def test_parse_strips_bom() -> None:
    assert len(parse("\ufeff" + NRT_CSV, "VIIRS_NOAA20_NRT")) == 1


def test_parse_missing_column() -> None:
    with pytest.raises(ValueError, match="missing columns.*confidence"):
        parse("latitude,longitude,acq_date,acq_time,satellite\n57,-118,2024-05-10,835,N\n", "X")


@pytest.mark.parametrize("bad", [
    ("55.7831", "abc"), ("2024-05-10", "2024-13-40"), (",n,2,", ",7,2,"), ("835", "2400"), (",0\n", ",x\n"),
])
def test_parse_bad_row_names_source_and_line(bad) -> None:
    lines = SP_CSV.splitlines(keepends=True)
    lines[1] = lines[1].replace(*bad, 1)
    with pytest.raises(ValueError, match=r"VIIRS_SNPP_SP: bad row on line 2"):
        parse("".join(lines), "VIIRS_SNPP_SP")


# --- dedupe ------------------------------------------------------------------------------------

def test_dedupe_across_sources() -> None:
    a = pt(source="VIIRS_SNPP_SP")
    b = pt(source="VIIRS_NOAA20_SP")  # same lat, lon, date, time
    c = pt(t=836)
    # one survivor per key; the smallest record wins ("VIIRS_NOAA20_SP" < "VIIRS_SNPP_SP")
    assert dedupe([a, b, c]) == dedupe([c, b, a]) == [b, c]


points = st.builds(
    pt,
    lat=st.sampled_from([53.9, 54.0, 57.0, 57.001, 60.0, 60.1]),
    lon=st.sampled_from([-126.1, -126.0, -118.0, -117.998, -109.0, -108.9]),
    d=st.sampled_from([date(2022, 7, 1), date(2023, 7, 1), date(2024, 5, 10), date(2025, 6, 1), date(2026, 11, 9)]),
    t=st.sampled_from([835, 1012, 2059]),
    source=st.sampled_from(["VIIRS_SNPP_SP", "VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"]),
    conf=st.sampled_from(["l", "n", "h"]),
    typ=st.sampled_from([None, 0, 1, 2, 3]),
)


@given(st.lists(points, max_size=40), st.randoms(use_true_random=False))
def test_property_3_dedupe_idempotent_and_order_free(ps, rnd) -> None:
    """Property 3. Validates: Requirements 2.2."""
    once = dedupe(ps)
    assert dedupe(once) == once
    shuffled = list(ps)
    rnd.shuffle(shuffled)
    assert dedupe(shuffled) == once
    assert len({p.key for p in once}) == len(once) == len({p.key for p in ps})


# --- recurring cells ---------------------------------------------------------------------------

def test_recurring_cells_need_three_of_four_years() -> None:
    flare = [pt(lat=57.0, lon=-118.0, d=date(y, 7, 1)) for y in (2022, 2023, 2025)]
    two = [pt(lat=58.0, lon=-119.0, d=date(y, 7, 1)) for y in (2022, 2024)]
    same_year = [pt(lat=59.0, lon=-120.0, d=date(2023, m, 1)) for m in (5, 6, 7, 8)]
    old = [pt(lat=56.0, lon=-121.0, d=date(y, 7, 1)) for y in (2019, 2020, 2022)]  # 2 years too old
    cells = recurring_cells(flare + two + same_year + old, years=range(2022, 2026))
    assert cells == {pt(lat=57.0, lon=-118.0).cell}


def test_cell_is_about_375_m() -> None:
    assert pt(lat=57.0, lon=-118.0).cell == pt(lat=57.0015, lon=-118.0015).cell
    assert pt(lat=57.0, lon=-118.0).cell != pt(lat=57.0025, lon=-118.0).cell


# --- clean -------------------------------------------------------------------------------------

def test_clean_rules() -> None:
    flare = pt(lat=57.0, lon=-118.0)
    cells = {flare.cell}
    cases = {
        "keep_sp": pt(lat=57.5), "keep_h": pt(lat=57.5, conf="h"), "keep_sp_in_recurring_cell": flare,
        "low": pt(conf="l"), "type2": pt(typ=2), "type3": pt(typ=3), "outside": pt(lon=-108.9),
        "nrt_recurring": pt(source="VIIRS_NOAA20_NRT", typ=None),
        "keep_nrt": pt(lat=58.5, source="VIIRS_NOAA20_NRT", typ=None),
    }
    kept, counts = clean_with_counts(cases.values(), cells)
    assert {k for k, v in cases.items() if v in kept} == {"keep_sp", "keep_h", "keep_sp_in_recurring_cell", "keep_nrt"}
    assert counts == Counter(confidence=1, type=2, bbox=1, recurring=1)


def test_bbox_edges_are_inside() -> None:
    assert clean([pt(lat=54.0, lon=-126.0), pt(lat=60.0, lon=-109.0)], set()) == [
        pt(lat=54.0, lon=-126.0), pt(lat=60.0, lon=-109.0)]


@given(st.lists(points, max_size=40), st.lists(points, max_size=10))
def test_property_4_cleaning_only_removes(ps, flares) -> None:
    """Property 4. Validates: Requirements 2.3, 2.4, 2.5."""
    cells = {p.cell for p in flares}
    kept = clean(ps, cells)
    assert all(p in ps for p in kept) and len(kept) <= len(ps)
    for p in kept:
        assert p.confidence in {"n", "h"}
        assert p.type not in {2, 3}
        assert not (p.is_nrt and p.cell in cells)
        assert bool(in_bbox(p.lon, p.lat))
    # every dropped point has a reason, every kept one has none
    assert all((drop_reason(p, cells) is None) == (p in kept) for p in ps)


def test_static_type_cells_counts_distinct_cells_in_bbox() -> None:
    ps = [pt(typ=2), pt(typ=2, t=1012), pt(lat=58.0, typ=3), pt(lat=58.5, typ=0), pt(lon=-108.9, typ=2)]
    assert len(static_type_cells(ps)) == 2
