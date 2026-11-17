"""Detection hulls for years without NBAC (Requirement 3.3), following reference/gibs-pipeline.js:
rasterise points, dilate by a disc of radius 2 px (dx² + dy² <= r²), 4-connected components.
Each component's pixel squares become its polygon, so its mask (pixel centres) is exactly the component.
"""

from collections import deque
from collections.abc import Iterable

import numpy as np
import shapely
from shapely.geometry import box

from .config import GRID_H, GRID_W, HULL_DILATE_PX
from .grid import grid_to_lonlat, to_3978
from .points import Point
from .scars import Scar, build_scar, rank


def rasterise_points(points: Iterable[Point]) -> np.ndarray:
    mask = np.zeros((GRID_H, GRID_W), dtype=bool)
    for p in points:
        i, j = int(np.floor(p.x)), int(np.floor(p.y))
        if 0 <= i < GRID_W and 0 <= j < GRID_H:
            mask[j, i] = True
    return mask


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    """Disc dilation, as P.dilate in reference/gibs-pipeline.js."""
    out = mask.copy()
    H, W = mask.shape
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if (dx or dy) and dx * dx + dy * dy <= r * r:
                src = mask[max(0, -dy):H - max(0, dy), max(0, -dx):W - max(0, dx)]
                out[max(0, dy):H - max(0, -dy), max(0, dx):W - max(0, -dx)] |= src
    return out


def components(mask: np.ndarray) -> list[np.ndarray]:
    """4-connected components as boolean masks, in scan order of their first pixel."""
    H, W = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    for j, i in zip(*np.nonzero(mask)):
        if seen[j, i]:
            continue
        comp = np.zeros_like(mask, dtype=bool)
        q = deque([(j, i)])
        seen[j, i] = True
        while q:
            y, x = q.popleft()
            comp[y, x] = True
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    q.append((yy, xx))
        out.append(comp)
    return out


def _grid_to_3978(xy: np.ndarray) -> np.ndarray:
    lon, lat = grid_to_lonlat(xy[:, 0], xy[:, 1])
    return np.column_stack(to_3978().transform(lon, lat))


def component_polygon(comp: np.ndarray) -> shapely.Geometry:
    """Union of the component's pixel squares, in EPSG:3978. Edges are split per pixel before projecting."""
    boxes = []
    for j in np.unique(np.nonzero(comp)[0]):
        cols = np.nonzero(comp[j])[0]
        breaks = np.nonzero(np.diff(cols) > 1)[0]
        for a, b in zip(np.r_[0, breaks + 1], np.r_[breaks, len(cols) - 1]):
            boxes.append(box(cols[a], j, cols[b] + 1, j + 1))
    grid_poly = shapely.segmentize(shapely.union_all(boxes), 1.0)
    return shapely.make_valid(shapely.transform(grid_poly, _grid_to_3978))


def hull_scars(points: Iterable[Point], year: int, r: int = HULL_DILATE_PX) -> list[Scar]:
    """Scars from cleaned detections of one fire season (May 1–Oct 31), ranked by area."""
    comps = components(dilate(rasterise_points(points), r))
    return rank(build_scar(year, "hull", component_polygon(c)) for c in comps)
