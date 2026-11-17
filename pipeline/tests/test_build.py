"""Season build and publishing (Requirements 3.6, 5.5, 8.1–8.4), including Property 9 and a golden test."""

import json
import shutil
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from pipeline import __main__ as cli
from pipeline.build import BuildError, assemble_season, grid_int, seasons_document
from pipeline.config import GRID_H, GRID_W, KeyMissing
from pipeline.points import Point
from pipeline.publish import PublishError, mask_png, publish_json
from pipeline.rules import is_zombie_year
from pipeline.scars import build_scar
from pipeline.snow import opaque
from pipeline.tests.geo import grid_box_3978, pt_at

YEAR = 2024
D0 = date(YEAR, 3, 21)
GOLDEN = Path(__file__).parent / "fixtures" / "golden_s2024.json"
NODE = shutil.which("node")

# A corner band that always carries snow, so no day is "region-wide missing" (< 2000 px).
BASE = np.zeros((GRID_H, GRID_W), dtype=bool)
BASE[:3, :] = True
CLEAR = np.zeros((GRID_H, GRID_W), dtype=bool)
CLEAR.setflags(write=False)


def scars_2023():
    boxes = [(500, 300, 20, 14), (200, 450, 14, 10), (800, 150, 10, 8), (650, 600, 5, 5)]
    return [build_scar(YEAR - 1, "nbac", grid_box_3978(x, y, x + w, y + h)) for x, y, w, h in boxes]


def frames_for(scars, melt_days, cloudy=None):
    """Each scar is fully snow-covered before its melt day and clear from it on.
    `cloudy` = {day: scar index} puts cloud over that scar on that day."""
    cache = {}
    days = []
    for d in range(103):
        snowy = tuple(i for i, m in enumerate(melt_days) if m is None or d < m)
        if snowy not in cache:
            f = BASE.copy()
            for i in snowy:
                f |= scars[i].mask
            f.setflags(write=False)
            cache[snowy] = f
        cloud = CLEAR
        if cloudy and d in cloudy:
            cloud = scars[cloudy[d]].mask
        days.append((cache[snowy], cloud))
    return days


def on(scar, day, **kw):
    """A point at the scar's centroid pixel centre, `day` days after Mar 21."""
    return pt_at(scar.cx + 0.5, scar.cy + 0.5, D0 + timedelta(days=day), **kw)


def with_(p: Point, **kw) -> Point:
    return Point(**{**p.__dict__, **kw})


def scenario():
    scars = scars_2023()
    graves_by_size = sorted(scars, key=lambda s: -s.area_m2)
    big, mid, small, tiny = graves_by_size
    melts = {id(big): 20, id(mid): 30, id(small): 25, id(tiny): None}
    frames = frames_for(scars, [melts[id(s)] for s in scars], cloudy={21: scars.index(big)})
    points = [
        on(big, 26), on(big, 26, source="VIIRS_NOAA20_SP"),  # rise day 26; same key, so dedupe keeps one
        with_(on(big, 26), acq_time=2010),  # a second detection the same day
        on(mid, 10),  # early hit, before melt 30
        with_(on(small, 40), type=2),  # flare: dropped
        with_(on(small, 41), confidence="l"),  # low confidence: dropped
        pt_at(950.5, 650.5, D0 + timedelta(days=33)), pt_at(952.5, 651.5, D0 + timedelta(days=31)),  # new fire
        pt_at(100.5, 100.5, D0 - timedelta(days=1)),  # before the season
    ]
    return scars, points, frames, (big, mid, small, tiny)


def test_assemble_season_rows() -> None:
    scars, points, frames, (big, mid, small, tiny) = scenario()
    b = assemble_season(YEAR, scars, points, frames)
    rows = b.block["g"]
    assert [r[0] for r in rows] == [big.size_px, mid.size_px, small.size_px, tiny.size_px]
    # the hits sit at pixel centres (cx + 0.5, cy + 0.5); published positions round half up
    assert rows[0][3] == 20 and rows[0][4] == [26, big.cx + 1, big.cy + 1] and rows[0][5] == 0
    assert rows[1][3] == 30 and rows[1][4] == 0 and rows[1][5] == 1  # early hit counted, no rise
    assert rows[2][4] == 0  # flare and low-confidence points dropped
    assert rows[3][3] == -1 and rows[3][4] == 0  # never melts
    snow0 = [int(v) for v in rows[0][6].split(",")]
    assert snow0[:20] == [100] * 20 and snow0[20] == 0 and snow0[21] == -1  # cloud over it on day 21
    assert b.block["f"] == [[952, 651, 31]]
    assert b.drop_counts == {"type": 1, "confidence": 1}
    assert b.result.risen_count == 1
    assert 0.0 <= b.block["chance"] <= 1.0
    assert b.block["zombie"] == is_zombie_year(1, 4, b.block["chance"])


def test_season_with_no_melt_fails_instead_of_inventing_chance() -> None:
    scars = scars_2023()
    with pytest.raises(BuildError, match="chance is undefined"):
        assemble_season(YEAR, scars, [], frames_for(scars, [None] * 4))


def test_no_scars_fails() -> None:
    with pytest.raises(BuildError, match="no scars"):
        assemble_season(YEAR, [], [], frames_for([], []))


def test_grid_int_rounds_half_up_and_clips() -> None:
    assert [grid_int(v, 1060) for v in (0.49, 0.5, 1.5, 2.5, -3.0, 1059.6, 2000.0)] == [0, 1, 2, 3, 0, 1059, 1059]


def test_golden_season() -> None:
    """Regression guard: a fixed synthetic season must give exactly the stored block."""
    scars, points, frames, _ = scenario()
    block = assemble_season(YEAR, scars, points, frames).block
    if not GOLDEN.exists():  # first run writes the fixture; review it before committing
        GOLDEN.parent.mkdir(parents=True, exist_ok=True)
        GOLDEN.write_text(json.dumps(block, indent=1) + "\n", encoding="utf-8")
    assert block == json.loads(GOLDEN.read_text(encoding="utf-8"))


# --- Property 9 --------------------------------------------------------------------------------

@settings(max_examples=12, suppress_health_check=[HealthCheck.too_slow])
@given(
    st.lists(st.one_of(st.none(), st.integers(0, 102)), min_size=4, max_size=4),
    st.lists(st.tuples(st.integers(0, 3), st.integers(-5, 110), st.floats(-3, 3), st.floats(-3, 3),
                       st.sampled_from(["l", "n", "h"]), st.sampled_from([0, 2])), max_size=25),
)
def test_property_9_rows_match_the_engine(melts, raw) -> None:
    """Property 9. Validates: Requirements 8.1, 8.2, 8.3."""
    scars = scars_2023()
    frames = frames_for(scars, melts)
    pts = [pt_at(scars[i].cx + 0.5 + dx, scars[i].cy + 0.5 + dy, D0 + timedelta(days=d), )
           for i, d, dx, dy, _, _ in raw]
    pts = [with_(p, confidence=c, type=t) for p, (_, _, _, _, c, t) in zip(pts, raw)]
    try:
        b = assemble_season(YEAR, scars, pts, frames)
    except BuildError:
        assert all(m is None for m in melts)
        return
    for row, r in zip(b.block["g"], b.result.graves):
        assert row[3] == (-1 if r.melt_day is None else r.melt_day)
        assert row[4] == (0 if r.rise is None else [r.rise.day, grid_int(r.rise.x, GRID_W), grid_int(r.rise.y, GRID_H)])
        assert row[5] == r.early_hits
        snow = row[6].split(",")
        assert len(snow) == 103 and all(-1 <= int(v) <= 100 for v in snow)
    risen = sum(row[4] != 0 for row in b.block["g"])
    assert risen == b.result.risen_count
    assert b.block["zombie"] == is_zombie_year(risen, len(b.block["g"]), b.block["chance"])


# --- publishing --------------------------------------------------------------------------------

def document():
    scars, points, frames, _ = scenario()
    b = assemble_season(YEAR, scars, points, frames)
    builds = [b, *[type(b)(**{**b.__dict__, "year": y, "block": b.block}) for y in (2025, 2026)]]
    return seasons_document(builds, "2026-11-11T10:00:00Z")


@pytest.mark.skipif(NODE is None, reason="node not installed")
def test_publish_validates_then_replaces(tmp_path: Path) -> None:
    out = tmp_path / "seasons.json"
    publish_json(document(), out, "seasons")
    doc = json.loads(out.read_text(encoding="utf-8"))
    assert set(doc) == {"s2024", "s2025", "s2026", "static", "meta"}
    assert all(c in doc["meta"]["credit"] for c in ("FIRMS", "GIBS", "NBAC", "Scholten"))
    assert list(tmp_path.iterdir()) == [out]  # temp file gone


@pytest.mark.skipif(NODE is None, reason="node not installed")
def test_publish_keeps_previous_file_when_invalid(tmp_path: Path) -> None:
    out = tmp_path / "seasons.json"
    out.write_text("previous", encoding="utf-8")
    bad = document()
    bad["s2025"]["zombie"] = not bad["s2025"]["zombie"]
    with pytest.raises(PublishError, match=r"\$\.s2025\.zombie"):
        publish_json(bad, out, "seasons")
    assert out.read_text(encoding="utf-8") == "previous"
    assert list(tmp_path.iterdir()) == [out]


def test_mask_png_round_trip() -> None:
    m = np.zeros((GRID_H, GRID_W), dtype=bool)
    m[10:20, 30:40] = True
    assert np.array_equal(opaque(mask_png(m)), m)
    with pytest.raises(ValueError):
        mask_png(np.zeros((5, 5), dtype=bool))


def test_cli_missing_key_exits_1(monkeypatch, capsys) -> None:
    def no_key():
        raise KeyMissing("FIRMS_MAP_KEY not set: add it as an environment variable, or ... .env")

    monkeypatch.setattr(cli, "firms_key", no_key)
    assert cli.main(["seasons"]) == 1
    assert "FIRMS_MAP_KEY not set" in capsys.readouterr().err
