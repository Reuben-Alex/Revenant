"""New fires: spring heat away from every scar (Requirements 7.1–7.3; reference/gibs-pipeline.js L53).

Distances are measured on the design grid between pixel centres: a point is a new-fire point when its
pixel is more than 15 px from every pixel of every year Y−1 scar. A scar too small to own a pixel
counts as the pixel holding its centroid. New-fire points are rasterised, dilated by a 3 px disc and
split into 4-connected clusters; the 24 with the most points are kept.
"""

from collections.abc import Sequence
from dataclasses import dataclass, field

import numpy as np

from .config import GRID_H, GRID_W, N_NEW_FIRES, NEW_FIRE_DILATE_PX, NEW_FIRE_MIN_PX, SEASON_DAYS
from .hulls import components, dilate
from .points import Point
from .proximity import season_day
from .scars import Scar


@dataclass(frozen=True)
class NewFire:
    x: float  # mean grid position of its points
    y: float
    first_day: int
    n_points: int
    points: tuple[Point, ...] = field(compare=False, repr=False)


def pixel_of(p: Point) -> tuple[int, int]:
    """(row, col) of the pixel holding the point, clipped to the grid (x = 1060 lies on the east edge)."""
    return min(max(int(np.floor(p.y)), 0), GRID_H - 1), min(max(int(np.floor(p.x)), 0), GRID_W - 1)


def footprint(scars: Sequence[Scar]) -> np.ndarray:
    out = np.zeros((GRID_H, GRID_W), dtype=bool)
    for s in scars:
        if s.size_px:
            out |= s.mask
        else:
            out[s.cy, s.cx] = True
    return out


def near_scar_mask(scars: Sequence[Scar], px: int = NEW_FIRE_MIN_PX) -> np.ndarray:
    """Pixels within `px` (centre to centre, inclusive) of any scar pixel."""
    return dilate(footprint(scars), px)


def new_fire_points(points: Sequence[Point], scars: Sequence[Scar], year: int) -> list[tuple[Point, int]]:
    near = near_scar_mask(scars)
    out = []
    for p in points:
        day = season_day(p.acq_date, year)
        if 0 <= day < SEASON_DAYS and not near[pixel_of(p)]:
            out.append((p, day))
    return out


def new_fires(points: Sequence[Point], scars: Sequence[Scar], year: int, n: int = N_NEW_FIRES) -> list[NewFire]:
    """Clusters of new-fire points, most points first (ties: earliest day, then position)."""
    nf = new_fire_points(points, scars, year)
    raster = np.zeros((GRID_H, GRID_W), dtype=bool)
    for p, _ in nf:
        raster[pixel_of(p)] = True
    label = np.full((GRID_H, GRID_W), -1, dtype=np.int32)
    for k, comp in enumerate(components(dilate(raster, NEW_FIRE_DILATE_PX))):
        label[comp] = k
    groups: dict[int, list[tuple[Point, int]]] = {}
    for p, day in nf:
        groups.setdefault(int(label[pixel_of(p)]), []).append((p, day))
    fires = [
        NewFire(
            x=float(np.mean([p.x for p, _ in g])),
            y=float(np.mean([p.y for p, _ in g])),
            first_day=min(d for _, d in g),
            n_points=len(g),
            points=tuple(p for p, _ in g),
        )
        for g in groups.values()
    ]
    fires.sort(key=lambda f: (-f.n_points, f.first_day, f.y, f.x))
    return fires[:n]
