"""Chance baseline (Requirements 6.1–6.3; design.md "Chance baseline"; reference/gibs-pipeline.js L54).

Each grave with a melt day is shifted to random offsets (dx uniform in ±200 px, dy in ±150 px; up to
300 tries, up to 30 accepted). An offset is accepted when the shifted shape stays inside the bbox and
touches no year Y−1 scar ("unburned ground"). It is a hit when the Engine's `find_rise` finds a rise
for the cleaned points within 1 km of the shifted shape, using the grave's own melt day.
chance = hits / accepted. The RNG is seeded with the season year, so a re-run gives the same value.

Shifts are applied in lon/lat (1 px = 17/1060° lon, 6/716° lat), i.e. on the design grid, and the
shifted shape is projected to EPSG:3978 only for the 1 km test.
"""

from collections.abc import Sequence
from dataclasses import dataclass, field

import numpy as np
import shapely
from shapely import STRtree
from shapely.affinity import translate

from .config import (
    CHANCE_ATTEMPTS,
    CHANCE_DX,
    CHANCE_DY,
    CHANCE_OFFSETS,
    GRID_H,
    GRID_W,
    PROXIMITY_M,
    SEASON_DAYS,
)
from .grid import LAT_SPAN, LON_SPAN, bbox_lonlat, from_3978, reproject, to_3978
from .points import Point
from .proximity import points_3978, season_day
from .rules import Hotspot, find_rise
from .scars import Scar


class ChanceUndefined(ValueError):
    """No offset was accepted (e.g. no grave melted): chance is unknown, never reported as 0."""


@dataclass(frozen=True)
class Offset:
    grave: int  # index into graves
    dx: float  # grid px
    dy: float
    hit: bool
    polygon_lonlat: shapely.Geometry = field(compare=False, repr=False)


@dataclass(frozen=True)
class ChanceResult:
    offsets: tuple[Offset, ...]
    attempts: int

    @property
    def accepted(self) -> int:
        return len(self.offsets)

    @property
    def hits(self) -> int:
        return sum(o.hit for o in self.offsets)

    @property
    def rate(self) -> float:
        if not self.offsets:
            raise ChanceUndefined("no chance offsets were accepted")
        return self.hits / self.accepted


def shift_lonlat(poly_lonlat: shapely.Geometry, dx_px: float, dy_px: float) -> shapely.Geometry:
    """Move a lon/lat shape by grid pixels (+dy is south, as grid y grows downwards)."""
    return translate(poly_lonlat, xoff=dx_px * LON_SPAN / GRID_W, yoff=-dy_px * LAT_SPAN / GRID_H)


def simulate(
    graves: Sequence[Scar],
    melts: Sequence[int | None],
    points: Sequence[Point],
    all_scars: Sequence[Scar],
    year: int,
    rng: np.random.Generator,
) -> ChanceResult:
    if len(graves) != len(melts):
        raise ValueError("graves and melts differ in length")
    region = bbox_lonlat()
    shapely.prepare(region)
    to_ll = from_3978()
    blockers = STRtree([reproject(s.polygon_3978, to_ll) for s in all_scars])

    spring = [(p, season_day(p.acq_date, year)) for p in points]
    spring = [(p, d) for p, d in spring if 0 <= d < SEASON_DAYS]
    pts = points_3978([p for p, _ in spring])
    pt_tree = STRtree(pts) if len(pts) else None

    offsets: list[Offset] = []
    attempts = 0
    for gi, (grave, melt) in enumerate(zip(graves, melts)):
        if melt is None:
            continue  # its window never opens
        shape = reproject(grave.polygon_3978, to_ll)
        accepted = 0
        for _ in range(CHANCE_ATTEMPTS):
            if accepted == CHANCE_OFFSETS:
                break
            attempts += 1
            dx = float(rng.uniform(-CHANCE_DX, CHANCE_DX))
            dy = float(rng.uniform(-CHANCE_DY, CHANCE_DY))
            moved = shift_lonlat(shape, dx, dy)
            if not region.contains(moved) or len(blockers.query(moved, predicate="intersects")):
                continue
            accepted += 1
            hit = False
            if pt_tree is not None:
                near = pt_tree.query(reproject(moved, to_3978()), predicate="dwithin", distance=PROXIMITY_M)
                hs = [Hotspot(day=spring[i][1], x=spring[i][0].x, y=spring[i][0].y, on_scar=True) for i in near]
                hit = find_rise(hs, melt, SEASON_DAYS) is not None
            offsets.append(Offset(gi, dx, dy, hit, moved))
    return ChanceResult(tuple(offsets), attempts)


def chance_rate(graves, melts, points, all_scars, year: int) -> float:
    """Published `chance` for season `year` (RNG seeded with the year). Raises ChanceUndefined."""
    return simulate(graves, melts, points, all_scars, year, np.random.default_rng(seed=year)).rate
