"""Building the published seasons (Requirements 8.1–8.3). All rule results come from pipeline/rules.

`assemble_season` is pure (scars, points and frames in; a published block out), so it is tested offline.
`build_season` adds the fetching.
"""

import math
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np

from .chance import ChanceResult, ChanceUndefined, simulate
from .config import (
    CREDIT,
    GRID_H,
    GRID_W,
    LAYERS,
    NBAC_RELEASE,
    PROXIMITY_M,
    SEASON_DAYS,
    SP_SOURCES,
    season_start,
)
from .firms import Firms
from .gibs import Gibs
from .nbac import Nbac
from .newfires import NewFire, new_fires
from .points import Cell, Point, clean_with_counts, dedupe, parse, static_type_cells
from .proximity import points_3978, scar_hotspots
from .rules import GraveInput, SeasonResult, classify_season, melt_day
from .scars import Scar, scars_from_nbac, top_graves
from .snow import Frame, cloud_frame, opaque, percent_string, table

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
