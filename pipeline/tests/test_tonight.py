"""Tonight (Requirements 2.5, 2.6, 3.3, 9.1–9.5): keyframe, recurrence scan, assembly, publishing."""

import io
import json
import shutil
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pipeline.build import BuildError, assemble_tonight, recurring_cells_for
from pipeline.config import GRID_H, GRID_W
from pipeline.keyframe import pick, score, to_webp
from pipeline.points import Point, csv_cells, decode_cell, encode_cell, parse, recurring_cells, recurring_from_keys
from pipeline.publish import publish_json
from pipeline.tests.fakes import FakeClock, FakeResponse, FakeSession
from pipeline.tests.geo import pt_at

TODAY = date(2026, 11, 17)
AS_OF = "2026-11-17T10:05:00Z"
H, W = 6, 8


def jpeg(rgb) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(np.asarray(rgb, dtype=np.uint8), "RGB").save(buf, "JPEG", quality=100, subsampling=0)
    return buf.getvalue()


def png(alpha) -> bytes:
    rgba = np.zeros(alpha.shape + (4,), dtype=np.uint8)
    rgba[..., 3] = np.where(alpha, 255, 0)
    buf = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buf, "PNG")
    return buf.getvalue()


# --- keyframe ----------------------------------------------------------------------------------

def frame_with(bright_rows=0, black_rows=0):
    rgb = np.full((H, W, 3), 90)
    rgb[:bright_rows] = 230
    if black_rows:
        rgb[H - black_rows:] = 0
    return jpeg(rgb)


def test_score_counts_bright_pixels_that_are_not_snow() -> None:
    snow = np.zeros((H, W), dtype=bool)
    snow[0, :] = True  # first bright row is snow, not cloud
    assert score(frame_with(bright_rows=2), png(snow), (H, W)) == pytest.approx(W / (H * W))
    assert score(frame_with(bright_rows=2), None, (H, W)) == pytest.approx(2 * W / (H * W))


def test_score_skips_swath_gaps_and_bad_frames() -> None:
    assert score(frame_with(black_rows=1), None, (H, W)) is None  # 1/6 black > 5 %
    assert score(None, None, (H, W)) is None
    assert score(b"\xff\xd8\xffbroken", None, (H, W)) is None


def test_pick_lowest_score_then_latest() -> None:
    d = [TODAY - timedelta(days=k) for k in range(1, 6)]
    clear, cloudy, gap = frame_with(0), frame_with(3), frame_with(black_rows=2)
    got = pick([(d[0], cloudy, None), (d[1], clear, None), (d[2], clear, None), (d[3], gap, None), (d[4], None, None)],
               (H, W))
    assert got == (d[1], clear)  # tie between d[1] and d[2]: the latest wins
    assert pick([(d[0], gap, None), (d[1], None, None)], (H, W)) is None


def test_to_webp() -> None:
    with Image.open(io.BytesIO(to_webp(frame_with(2)))) as im:
        assert im.format == "WEBP" and im.size == (W, H)


# --- recurrence scan ---------------------------------------------------------------------------

CSV_HEAD = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,type\n"


def csv_rows(rows) -> str:
    return CSV_HEAD + "".join(f"{lat},{lon},300,0.4,0.4,{d},1000,N,VIIRS,{c},2,280,1,D,{t}\n" for lat, lon, d, c, t in rows)


def test_csv_cells_match_point_cells() -> None:
    rows = [(57.0015, -118.0021, "2023-07-01", "l", 2), (59.999, -109.0, "2024-01-02", "n", 0),
            (61.0, -118.0, "2024-01-02", "h", 0)]  # last one outside the bbox
    years, keys = csv_cells(csv_rows(rows))
    pts = parse(csv_rows(rows[:2]), "VIIRS_SNPP_SP")
    assert years.tolist() == [2023, 2024]
    assert [decode_cell(k) for k in keys] == [p.cell for p in pts]


def test_recurring_from_keys_matches_recurring_cells() -> None:
    rows = [(57.0, -118.0, f"{y}-07-01", "l", 2) for y in (2022, 2023, 2025)]  # flare-like: 3 years
    rows += [(58.0, -119.0, f"{y}-07-01", "n", 0) for y in (2022, 2024)]  # 2 years only
    rows += [(59.0, -120.0, f"2023-0{m}-01", "h", 0) for m in (5, 6, 7)]  # 3 detections, 1 year
    years, keys = csv_cells(csv_rows(rows))
    per_year = {y: keys[years == y] for y in (2022, 2023, 2024, 2025)}
    pts = parse(csv_rows(rows), "VIIRS_SNPP_SP")
    assert recurring_from_keys(per_year) == recurring_cells(pts, range(2022, 2026)) == {pts[0].cell}


def test_encode_cell_round_trip() -> None:
    for lat, lon in [(54.0, -126.0), (60.0, -109.0), (57.0018, -117.9982)]:
        p = pt_at(0, 0)
        p = Point(p.acq_date, p.acq_time, lat, lon, p.source, p.satellite, p.confidence, p.type, 0.0, 0.0)
        assert decode_cell(int(encode_cell(lat, lon))) == p.cell


def test_recurring_scan_uses_all_sp_rows_and_caches(tmp_path: Path) -> None:
    from pipeline.firms import Firms
    from pipeline.http import Client

    flare = [(57.0, -118.0, f"{y}-07-01", "l", 2) for y in (2022, 2023, 2025)]  # low confidence AND type 2
    body = {y: csv_rows([r for r in flare if r[2].startswith(str(y))]) for y in range(2022, 2026)}
    avail = b"data_id,min_date,max_date\nVIIRS_SNPP_SP,2012-01-20,2026-07-31\n"

    def route(url):
        if "mapkey_status" in url:
            return FakeResponse(200, b'{"transaction_limit":5000,"current_transactions":0}')
        if "data_availability" in url:
            return FakeResponse(200, avail)
        start = date.fromisoformat(url.rsplit("/", 1)[1])
        n = int(url.rsplit("/", 2)[1])
        rows = [r for r in flare if start <= date.fromisoformat(r[2]) < start + timedelta(days=n)]
        return FakeResponse(200, csv_rows(rows).encode())

    clock = FakeClock()
    s = FakeSession(route=route)
    firms = Firms(Client(s, sleep=clock.sleep, clock=clock, interval=0), "k" * 32, today=TODAY,
                  cache_dir=tmp_path / "firms")
    cells = recurring_cells_for(firms, 2026, cache_dir=tmp_path / "derived")
    assert cells == {parse(body[2022], "VIIRS_SNPP_SP")[0].cell}  # the type 2, low-confidence flare counts
    n = len(s.urls)
    assert recurring_cells_for(firms, 2026, cache_dir=tmp_path / "derived") == cells
    assert len(s.urls) == n  # cached result: no requests
    assert (tmp_path / "derived" / "recurring-2022-2025.json").exists()


# --- assembly ----------------------------------------------------------------------------------

def p(x, y, d, source="VIIRS_NOAA20_SP", typ=0, conf="n", t=1000):
    q = pt_at(x, y, d, source=source)
    return Point(q.acq_date, t, q.lat, q.lon, source, q.satellite, conf, typ, q.x, q.y)


def season_points():
    """Two burn areas in summer 2026: A (larger) and B, plus late NRT heat on A."""
    a = [p(500.5 + i, 300.5 + j, date(2026, 7, 10)) for i in range(6) for j in range(4)]
    b = [p(200.5 + i, 150.5, date(2026, 6, 5)) for i in range(3)]
    late = [
        p(502.5, 301.5, TODAY - timedelta(days=13), "VIIRS_NOAA20_NRT", None),  # first day of the 14-day window
        p(503.5, 302.5, TODAY - timedelta(days=1), "VIIRS_NOAA21_NRT", None, t=900),  # latest
        p(501.5, 300.5, TODAY - timedelta(days=14), "VIIRS_NOAA20_NRT", None),  # one day too old
    ]
    return a, b, late


def snow_days(scar_masks_snow):
    """3 days: day 1 missing (no snow frame); others with the given scars fully snowy."""
    base = np.zeros((GRID_H, GRID_W), dtype=bool)
    base[:3, :] = True  # keep the region-wide count above 2000
    clear = np.zeros_like(base)
    days = [(None, clear)]
    for masks in scar_masks_snow:
        f = base.copy()
        for m in masks:
            f |= m
        days.append((f, clear))
    return days


def test_assemble_tonight_rows_and_clusters() -> None:
    a, b, late = season_points()
    flare = p(900.5, 600.5, TODAY - timedelta(days=2), "VIIRS_NOAA20_NRT", None)
    recurring = {flare.cell}
    pts = a + b + late + [flare]
    # first build to learn the masks, then give grave A snow on one day only
    first = assemble_tonight(TODAY, AS_OF, pts, recurring, snow_days([[], []]), (TODAY - timedelta(days=2), b"jpg"),
                             None, ["test"])
    ga, gb = first.graves
    t = assemble_tonight(TODAY, AS_OF, pts, recurring, snow_days([[ga.mask], []]),
                         (TODAY - timedelta(days=2), b"jpg"), None, ["test"])
    ra, rb = t.doc["g"]
    assert ra[:3] == [ga.size_px, ga.cx, ga.cy] and ra[0] > rb[0]
    assert ra[3] == (TODAY - timedelta(days=1)).isoformat()  # last burn = latest on-scar point
    assert ra[4] == 2  # today-13 and today-1 count, today-14 doesn't
    assert ra[5] == [504, 303]  # latest late point, rounded half up
    assert ra[6] == 100  # max over the 3 days (one missing, one 0 %, one 100 %)
    assert rb[3] == "2026-06-05" and rb[4] == 0 and rb[5] == 0 and rb[6] == 0
    assert t.doc["r"] == [[504, 303, 1]]  # last 7 days: only today-1 (today-2 is a dropped flare); half up
    assert t.doc["static"] == 1 and t.drop_counts == {"recurring": 1}
    assert t.doc["frame_date"] == (TODAY - timedelta(days=2)).isoformat() and t.frame_jpeg == b"jpg"
    assert t.doc["points_through"] == (TODAY - timedelta(days=1)).isoformat()
    assert "NBAC" not in t.doc["credit"] and "FIRMS" in t.doc["credit"]
    assert len(t.all_scars) == 2


def test_snow_now_is_minus_one_when_all_three_days_missing() -> None:
    a, b, late = season_points()
    t = assemble_tonight(TODAY, AS_OF, a + b, set(), [(None, None)] * 3, (TODAY, b"j"), None, ["test"])
    assert [row[6] for row in t.doc["g"]] == [-1, -1]


def test_stale_frame_keeps_previous_date_or_fails() -> None:
    a, b, _ = season_points()
    t = assemble_tonight(TODAY, AS_OF, a + b, set(), snow_days([[], []]), None, "2026-11-12", ["test"])
    assert t.doc["frame_date"] == "2026-11-12" and t.frame_jpeg is None
    with pytest.raises(BuildError, match="no usable true-colour frame"):
        assemble_tonight(TODAY, AS_OF, a + b, set(), snow_days([[], []]), None, None, ["test"])


def test_no_points_or_no_scars_fails() -> None:
    with pytest.raises(BuildError, match="no FIRMS points"):
        assemble_tonight(TODAY, AS_OF, [], set(), snow_days([[], []]), None, None, ["test"])
    only_late = [p(10.5, 10.5, TODAY - timedelta(days=1), "VIIRS_NOAA20_NRT", None)]  # November: not fire season
    with pytest.raises(BuildError, match="no 2026 fire-season detections"):
        assemble_tonight(TODAY, AS_OF, only_late, set(), snow_days([[], []]), None, None, ["test"])


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_tonight_document_passes_the_validator(tmp_path: Path) -> None:
    a, b, late = season_points()
    t = assemble_tonight(TODAY, AS_OF, a + b + late, set(), snow_days([[], []]), (TODAY - timedelta(days=1), b"j"),
                         None, ["NASA FIRMS test"])
    out = publish_json(t.doc, tmp_path / "tonight.json", "tonight")
    assert json.loads(out.read_text(encoding="utf-8"))["frame_date"] == (TODAY - timedelta(days=1)).isoformat()
