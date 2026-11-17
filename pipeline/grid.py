"""Design grid and projections (Requirement 3.1). The only place lon/lat <-> grid conversion happens.

docs/method.md: x -> lon = -126 + x/1060 * 17 ; y -> lat = 60 - y/716 * 6.
"""

from functools import lru_cache

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import Polygon, box

from .config import EAST, GRID_H, GRID_W, NORTH, SOUTH, WEST

LON_SPAN = EAST - WEST  # 17
LAT_SPAN = NORTH - SOUTH  # 6


def lonlat_to_grid(lon, lat):
    """Grid x, y (floats; arrays allowed) for lon/lat in degrees."""
    x = (np.asarray(lon, dtype=float) - WEST) / LON_SPAN * GRID_W
    y = (NORTH - np.asarray(lat, dtype=float)) / LAT_SPAN * GRID_H
    return x, y


def grid_to_lonlat(x, y):
    """Lon/lat in degrees for grid x, y (floats; arrays allowed)."""
    lon = WEST + np.asarray(x, dtype=float) / GRID_W * LON_SPAN
    lat = NORTH - np.asarray(y, dtype=float) / GRID_H * LAT_SPAN
    return lon, lat


def in_bbox(lon, lat):
    lon, lat = np.asarray(lon, dtype=float), np.asarray(lat, dtype=float)
    return (lon >= WEST) & (lon <= EAST) & (lat >= SOUTH) & (lat <= NORTH)


@lru_cache(maxsize=1)
def to_3978() -> Transformer:
    """WGS84 lon/lat -> EPSG:3978 (Canada Atlas Lambert) metres, for 1 km buffers (firms-points skill)."""
    return Transformer.from_crs("EPSG:4326", "EPSG:3978", always_xy=True)


@lru_cache(maxsize=1)
def from_3978() -> Transformer:
    return Transformer.from_crs("EPSG:3978", "EPSG:4326", always_xy=True)


def bbox_lonlat(step_deg: float = 0.05) -> Polygon:
    """The Revenant bbox as a lon/lat polygon with vertices every `step_deg`, so it stays exact once projected."""
    return shapely.segmentize(box(WEST, SOUTH, EAST, NORTH), step_deg)


def reproject(geom, transformer: Transformer):
    """Apply a pyproj transformer (always_xy) to every coordinate of a shapely geometry."""
    return shapely.transform(geom, lambda xy: np.column_stack(transformer.transform(xy[:, 0], xy[:, 1])))
