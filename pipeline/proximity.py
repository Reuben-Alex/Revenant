"""On the scar (Requirements 4.1–4.3): within 1000 m of the scar polygon, in EPSG:3978 metres.

shapely.dwithin is exact (distance <= d). EPSG:3978 shrinks distances here by 1.6–2.8 %, so this is
1017–1029 m on the ground; the UI and writeup say "≈1 km" (design.md, Proximity).
"""

from collections.abc import Sequence
from datetime import date

import numpy as np
import shapely

from .config import PROXIMITY_M, SEASON_DAYS, season_start
from .grid import to_3978
from .points import Point
from .rules import Hotspot
from .scars import Scar


def points_3978(points: Sequence[Point]) -> np.ndarray:
    """shapely Points in EPSG:3978 for each FIRMS point."""
    if not points:
        return np.array([], dtype=object)
    x, y = to_3978().transform([p.lon for p in points], [p.lat for p in points])
    return shapely.points(np.asarray(x), np.asarray(y))


def within(geom_3978: shapely.Geometry, pts_3978: np.ndarray, metres: float = PROXIMITY_M) -> np.ndarray:
    if len(pts_3978) == 0:
        return np.array([], dtype=bool)
    shapely.prepare(geom_3978)
    return np.asarray(shapely.dwithin(geom_3978, pts_3978, metres), dtype=bool)


def on_scar(points: Sequence[Point], scar: Scar, metres: float = PROXIMITY_M) -> list[bool]:
    return within(scar.polygon_3978, points_3978(points), metres).tolist()


def season_day(d: date, year: int) -> int:
    """Day index from Mar 21 (UTC) of `year`."""
    return (d - season_start(year)).days


def scar_hotspots(points: Sequence[Point], scar: Scar, year: int, pts_3978: np.ndarray | None = None) -> tuple[Hotspot, ...]:
    """On-scar points inside season `year` (days 0–102), as Engine hotspots (Requirement 4.3)."""
    pts = points_3978(points) if pts_3978 is None else pts_3978
    hits = within(scar.polygon_3978, pts)
    out = []
    for p, hit in zip(points, hits):
        day = season_day(p.acq_date, year)
        if hit and 0 <= day < SEASON_DAYS:
            out.append(Hotspot(day=day, x=p.x, y=p.y, on_scar=True))
    return tuple(out)
