"""Building the published seasons (Requirements 8.1–8.3). All rule results come from pipeline/rules.

`assemble_season` is pure (scars, points and frames in; a published block out), so it is tested offline.
`build_season` adds the fetching.
"""

import json
import math
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np

from .chance import ChanceResult, ChanceUndefined, simulate
from .config import (
    CLUSTER_DAYS,
    CREDIT,
    FIRE_SEASON,
    GRID_H,
    GRID_W,
    KEYFRAME_DAYS,
    LATE_HITS_DAYS,
    LAYERS,
    N_CLUSTERS,
    NBAC_RELEASE,
    NRT_SOURCES,
    PROXIMITY_M,
    RECUR_YEARS,
    SEASON_DAYS,
    SNOW_NOW_DAYS,
    SP_SOURCES,
    TONIGHT_CREDIT,
    season_start,
)
from .firms import Firms
from .gibs import Gibs
from .hulls import hull_scars
from .keyframe import pick
from .nbac import Nbac
from .newfires import NewFire, cluster, new_fires
from .points import Cell, Point, clean_with_counts, csv_cells, dedupe, parse, recurring_from_keys, static_type_cells
from .proximity import points_3978, scar_hotspots, within
from .rules import GraveInput, SeasonResult, classify_season, melt_day
from .scars import Scar, scars_from_nbac, top_graves
from .snow import Frame, cloud_frame, opaque, percent_string, table, to_percent

METHOD = "firms-nbac-v1"


class BuildError(RuntimeError):
    pass


@dataclass(frozen=True)
class Sources:
    firms: Firms
    gibs: Gibs
    nbac: Nbac


@dataclass(frozen=True, eq=False)
class SeasonBuild:
    year: int
    block: dict  # the published "sYYYY" block
    result: SeasonResult
    graves: list[Scar]
    all_scars: list[Scar]
    snow: list[tuple[float | None, ...]]
    chance: ChanceResult
    fires: list[NewFire]
    drop_counts: Counter
    static_cells: set[Cell]
    n_raw_points: int
    n_clean_points: int
    frames_missing: int = field(default=0)


def grid_int(v: float, size: int) -> int:
    """Nearest whole grid position, half up, clipped to the grid (rounding happens only here)."""
    return int(min(max(math.floor(v + 0.5), 0), size - 1))


def season_dates(year: int) -> tuple[date, date]:
    start = season_start(year)
    return start, start + timedelta(days=SEASON_DAYS - 1)


def season_points(firms: Firms, year: int, sources: Sequence[str] = SP_SOURCES) -> list[Point]:
    first, last = season_dates(year)
    pts: list[Point] = []
    for src in sources:
        for text in firms.fetch_period(src, first, last):
            pts.extend(parse(text, src))
    return dedupe(pts)


def season_frames(gibs: Gibs, year: int, layers: dict = LAYERS["replay"]) -> list[tuple[Frame, Frame]]:
    start = season_start(year)
    days = []
    for d in range(SEASON_DAYS):
        day = start + timedelta(days=d)
        snow = opaque(gibs.frame(layers["snow"], day, "png"))
        cloud = cloud_frame(gibs.frame(layers["cloud"], day, "png"), gibs.frame(layers["true_colour"], day, "jpeg"))
        days.append((snow, cloud))
    return days


def assemble_season(
    year: int, all_scars: Sequence[Scar], raw_points: Sequence[Point], frames: Sequence[tuple[Frame, Frame]]
) -> SeasonBuild:
    if len(frames) != SEASON_DAYS:
        raise BuildError(f"{year}: expected {SEASON_DAYS} days of frames, got {len(frames)}")
    graves = top_graves(all_scars)
    if not graves:
        raise BuildError(f"{year}: no scars from {year - 1} inside the bbox")
    clean, counts = clean_with_counts(raw_points, set())  # SP: FIRMS `type` filter, no recurrence filter
    snow = table([g.mask for g in graves], frames)
    pts = points_3978(clean)
    inputs = [
        GraveInput(id=f"G-{i + 1:02d}", size=g.size_px, cx=float(g.cx), cy=float(g.cy), snow=snow[i],
                   hotspots=scar_hotspots(clean, g, year, pts))
        for i, g in enumerate(graves)
    ]
    melts = [melt_day(s) for s in snow]
    sim = simulate(graves, melts, clean, all_scars, year, np.random.default_rng(seed=year))
    try:
        chance = sim.rate
    except ChanceUndefined as e:
        raise BuildError(f"Spring {year}: chance is undefined ({e}); nothing published") from None
    result = classify_season(inputs, chance, SEASON_DAYS)
    fires = new_fires(clean, all_scars, year)

    rows = []
    for g, r, s in zip(graves, result.graves, snow):
        rise = 0 if r.rise is None else [r.rise.day, grid_int(r.rise.x, GRID_W), grid_int(r.rise.y, GRID_H)]
        rows.append([g.size_px, g.cx, g.cy, -1 if r.melt_day is None else r.melt_day, rise, r.early_hits,
                     percent_string(s)])
    block = {
        "g": rows,
        "f": [[grid_int(f.x, GRID_W), grid_int(f.y, GRID_H), f.first_day] for f in fires],
        "chance": chance,
        "zombie": result.zombie_year,
    }
    return SeasonBuild(
        year=year, block=block, result=result, graves=list(graves), all_scars=list(all_scars), snow=snow,
        chance=sim, fires=fires, drop_counts=counts, static_cells=static_type_cells(raw_points),
        n_raw_points=len(raw_points), n_clean_points=len(clean),
        frames_missing=sum(1 for s, c in frames if s is None or c is None),
    )


def build_season(src: Sources, year: int, log=print) -> SeasonBuild:
    log(f"[{year}] NBAC {year - 1} scars")
    all_scars = scars_from_nbac(src.nbac.fires(year - 1))
    log(f"[{year}] {len(all_scars)} scars in the bbox; FIRMS SP points")
    raw = season_points(src.firms, year)
    log(f"[{year}] {len(raw)} points; GIBS snow + cloud frames")
    frames = season_frames(src.gibs, year)
    log(f"[{year}] classifying")
    return assemble_season(year, all_scars, raw, frames)


def seasons_document(builds: Sequence[SeasonBuild], generated_at: str) -> dict:
    doc: dict = {f"s{b.year}": b.block for b in builds}
    cells: set[Cell] = set()
    for b in builds:
        cells |= b.static_cells
    doc["static"] = len(cells)
    first, last = min(b.year for b in builds) - 1, max(b.year for b in builds) - 1
    doc["meta"] = {
        "generated_at": generated_at,
        "method": METHOD,
        "proximity_km": PROXIMITY_M / 1000,
        "sources": [
            "NASA FIRMS VIIRS 375 m active fire points (S-NPP, NOAA-20, NOAA-21), standard processing",
            "NASA GIBS VIIRS S-NPP NDSI snow cover; cloud = Cloud Top Height (day) where true colour is bright or black",
            f"NBAC burned-area polygons {first}–{last}, release {NBAC_RELEASE} (NRCan CWFIS)",
        ],
        "credit": CREDIT,
    }
    return doc


# --- Tonight (Requirements 2.5, 2.6, 3.3, 9.1–9.5) ---------------------------------------------

@dataclass(frozen=True, eq=False)
class TonightBuild:
    doc: dict  # published tonight.json
    frame_jpeg: bytes | None  # new latest frame, or None to keep the previous one
    graves: list[Scar]
    all_scars: list[Scar]  # every hull scar of the year (for the mask PNG, Requirement 3.6)
    n_raw_points: int
    n_clean_points: int
    drop_counts: Counter
    recurring: set[Cell]


def _late_window(today: date) -> tuple[date, date]:
    """The 14 days ending today; NRT data exists only for completed days, so today itself is empty."""
    return today - timedelta(days=LATE_HITS_DAYS - 1), today


def assemble_tonight(
    today: date,
    as_of: str,
    raw_points: Sequence[Point],
    recurring: set[Cell],
    snow_days: Sequence[tuple[Frame, Frame]],
    frame: tuple[date, bytes] | None,
    previous_frame_date: str | None,
    sources_used: Sequence[str],
) -> TonightBuild:
    """Pure: points, recurring cells, the last 3 days of snow/cloud frames and the picked frame in; doc out."""
    if not raw_points:
        raise BuildError("Tonight: no FIRMS points at all; nothing published")
    clean, counts = clean_with_counts(raw_points, recurring)
    (m0, d0), (m1, d1) = FIRE_SEASON
    season = [p for p in clean if date(today.year, m0, d0) <= p.acq_date <= date(today.year, m1, d1)]
    all_scars = hull_scars(season, today.year)
    graves = top_graves(all_scars)
    if not graves:
        raise BuildError(f"Tonight: no {today.year} fire-season detections to build scars from")

    pts = points_3978(clean)
    lo, hi = _late_window(today)
    snow = table([g.mask for g in graves], snow_days)
    rows = []
    for g, series in zip(graves, snow):
        on = [p for p, hit in zip(clean, within(g.polygon_3978, pts)) if hit]
        if not on:
            raise BuildError("Tonight: a hull scar has no points on it (should be impossible)")
        last = max(on, key=lambda p: (p.acq_date, p.acq_time))
        late = [p for p in on if lo <= p.acq_date <= hi]
        latest = max(late, key=lambda p: (p.acq_date, p.acq_time)) if late else None
        known = [v for v in series if v is not None]
        rows.append([
            g.size_px, g.cx, g.cy, last.acq_date.isoformat(), len(late),
            0 if latest is None else [grid_int(latest.x, GRID_W), grid_int(latest.y, GRID_H)],
            to_percent(max(known)) if known else -1,
        ])

    week = [(p, 0) for p in clean if today - timedelta(days=CLUSTER_DAYS) <= p.acq_date < today]
    clusters = cluster(week, N_CLUSTERS)
    if frame is not None:
        frame_date = frame[0].isoformat()
    elif previous_frame_date is not None:
        frame_date = previous_frame_date
    else:
        raise BuildError("Tonight: no usable true-colour frame in the last 5 days and no previous frame to keep")
    doc = {
        "g": rows,
        "r": [[grid_int(c.x, GRID_W), grid_int(c.y, GRID_H), c.n_points] for c in clusters],
        "static": len(recurring),
        "as_of": as_of,
        "frame_date": frame_date,
        "points_through": max(p.acq_date for p in raw_points).isoformat(),
        "sources": list(sources_used),
        "credit": TONIGHT_CREDIT,
    }
    return TonightBuild(doc, None if frame is None else frame[1], graves, all_scars, len(raw_points), len(clean),
                        counts, recurring)


def tonight_points(firms: Firms, today: date) -> tuple[list[Point], list[str]]:
    """Current year from May 1 to yesterday: SP up to the SP end date, then NRT (Requirement 1.1)."""
    avail = firms.availability()
    first, last = date(today.year, *FIRE_SEASON[0]), today - timedelta(days=1)
    sp_end = min(avail[s][1] for s in SP_SOURCES if s in avail)
    pts: list[Point] = []
    used: list[str] = []
    plan = [(s, first, sp_end) for s in SP_SOURCES] + [(s, sp_end + timedelta(days=1), last) for s in NRT_SOURCES]
    for src, lo, hi in plan:
        if src not in avail:
            continue
        lo, hi = max(lo, avail[src][0]), min(hi, avail[src][1], last)
        if lo > hi:
            continue
        for text in firms.fetch_period(src, lo, hi):
            pts.extend(parse(text, src))
        used.append(f"NASA FIRMS {src} {lo.isoformat()}..{hi.isoformat()}")
    return dedupe(pts), used


def recurring_cells_for(firms: Firms, year: int, cache_dir=None) -> set[Cell]:
    """NRT static filter: cells with SP detections (bbox only, before any other filter) in >= 3 of the
    4 complete years before `year`. Scanned page by page; the result is cached as a small JSON file."""
    from .config import CACHE_DIR

    years = list(range(year - RECUR_YEARS, year))
    path = (cache_dir or CACHE_DIR / "derived") / f"recurring-{years[0]}-{years[-1]}.json"
    if path.exists():
        return {tuple(c) for c in json.loads(path.read_text(encoding="utf-8"))}
    avail = firms.availability()
    per_year: dict[int, list[np.ndarray]] = {y: [] for y in years}
    for y in years:
        for src in SP_SOURCES:
            if src not in avail:
                continue
            lo, hi = max(date(y, 1, 1), avail[src][0]), min(date(y, 12, 31), avail[src][1])
            if lo > hi:
                continue
            for text in firms.fetch_period(src, lo, hi):
                ys, keys = csv_cells(text)
                per_year[y].append(keys[ys == y])
    cells = recurring_from_keys({y: np.concatenate(k) if k else np.array([], dtype=np.int64)
                                 for y, k in per_year.items()})
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(sorted(cells)), encoding="utf-8")
    return cells


def tonight_snow_days(gibs: Gibs, today: date, layers: dict = LAYERS["tonight"]) -> list[tuple[Frame, Frame]]:
    """(snow, cloud) for the 3 completed days before today (Requirement 9.1: snow % now)."""
    out = []
    for k in range(1, SNOW_NOW_DAYS + 1):
        day = today - timedelta(days=k)
        out.append((opaque(gibs.frame(layers["snow"], day, "png")),
                    cloud_frame(gibs.frame(layers["cloud"], day, "png"), gibs.frame(layers["true_colour"], day, "jpeg"))))
    return out


def tonight_frame(gibs: Gibs, today: date, layers: dict = LAYERS["tonight"]) -> tuple[date, bytes] | None:
    days = [today - timedelta(days=k) for k in range(1, KEYFRAME_DAYS + 1)]
    return pick([(d, gibs.frame(layers["true_colour"], d, "jpeg"), gibs.frame(layers["snow"], d, "png")) for d in days])


def build_tonight(src: Sources, today: date, as_of: str, previous_frame_date: str | None, log=print) -> TonightBuild:
    log(f"[tonight] recurring cells from SP {today.year - RECUR_YEARS}-{today.year - 1}")
    recurring = recurring_cells_for(src.firms, today.year)
    log(f"[tonight] {len(recurring)} recurring cells; FIRMS points {today.year}-05-01..{today - timedelta(days=1)}")
    raw, used = tonight_points(src.firms, today)
    log(f"[tonight] {len(raw)} points; GIBS NOAA-20 frames")
    snow_days = tonight_snow_days(src.gibs, today)
    frame = tonight_frame(src.gibs, today)
    sources_used = used + ["NASA GIBS VIIRS NOAA-20 NDSI snow, Cloud Top Height and true colour"]
    return assemble_tonight(today, as_of, raw, recurring, snow_days, frame, previous_frame_date, sources_used)
