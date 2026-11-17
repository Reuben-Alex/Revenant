"""Scars on the design grid (Requirements 3.2–3.5). Pure: takes polygons, returns Scar records.

A pixel belongs to a scar when its centre lies inside the scar polygon. Pixel (col i, row j) covers grid
x in [i, i+1), y in [j, j+1), so its centre is (i + 0.5, j + 0.5).
"""

from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
import shapely

from .config import GRID_H, GRID_W, N_GRAVES
from .grid import from_3978, grid_to_lonlat, lonlat_to_grid, to_3978
from .nbac import NbacFire


@dataclass(frozen=True, eq=False)
class Scar:
    year: int
    origin: str  # "nbac" | "hull"
    polygon_3978: shapely.Geometry
    mask: np.ndarray  # bool (GRID_H, GRID_W)
    size_px: int
    cx: int
    cy: int

    @property
    def area_m2(self) -> float:
        return float(self.polygon_3978.area)


@lru_cache(maxsize=1)
def pixel_centres_3978() -> tuple[np.ndarray, np.ndarray]:
    """EPSG:3978 coordinates of every pixel centre, shape (GRID_H, GRID_W)."""
    cols, rows = np.meshgrid(np.arange(GRID_W) + 0.5, np.arange(GRID_H) + 0.5)
    lon, lat = grid_to_lonlat(cols, rows)
    x, y = to_3978().transform(lon, lat)
    x, y = np.asarray(x), np.asarray(y)
    x.setflags(write=False)
    y.setflags(write=False)
    return x, y


def rasterise(polygon_3978: shapely.Geometry) -> np.ndarray:
    """Boolean grid mask of pixels whose centre lies inside the polygon."""
    X, Y = pixel_centres_3978()
    x0, y0, x1, y1 = polygon_3978.bounds
    near = (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
    mask = np.zeros((GRID_H, GRID_W), dtype=bool)
    if near.any():
        shapely.prepare(polygon_3978)
        mask[near] = shapely.contains_xy(polygon_3978, X[near], Y[near])
    return mask


def grid_centroid(polygon_3978: shapely.Geometry) -> tuple[int, int]:
    c = polygon_3978.centroid
    lon, lat = from_3978().transform(c.x, c.y)
    x, y = lonlat_to_grid(lon, lat)
    return int(np.clip(round(float(x)), 0, GRID_W - 1)), int(np.clip(round(float(y)), 0, GRID_H - 1))


def build_scar(year: int, origin: str, polygon_3978: shapely.Geometry) -> Scar:
    mask = rasterise(polygon_3978)
    mask.setflags(write=False)
    cx, cy = grid_centroid(polygon_3978)
    return Scar(year, origin, polygon_3978, mask, int(mask.sum()), cx, cy)


def rank(scars: Iterable[Scar]) -> list[Scar]:
    """Largest polygon area first; ties broken by centroid so the order never depends on input order."""
    return sorted(scars, key=lambda s: (-s.area_m2, s.cy, s.cx))


def scars_from_nbac(fires: Iterable[NbacFire]) -> list[Scar]:
    """One scar per NBAC record (a multipart record is one scar), ranked by area (Requirement 3.2)."""
    return rank(build_scar(f.year, "nbac", f.geometry) for f in fires)


def top_graves(scars: Iterable[Scar], n: int = N_GRAVES) -> list[Scar]:
    """The n largest scars, largest first, so G-01/BA-01 is the biggest (Requirement 3.4)."""
    return rank(scars)[:n]


def union_mask(scars: Iterable[Scar]) -> np.ndarray:
    out = np.zeros((GRID_H, GRID_W), dtype=bool)
    for s in scars:
        out |= s.mask
    return out
