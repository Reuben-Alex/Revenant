"""Small geometry helpers shared by pipeline tests."""

from datetime import date

import shapely
from shapely.geometry import box

from pipeline.grid import grid_to_lonlat, reproject, to_3978
from pipeline.points import Point


def grid_box_3978(x0, y0, x1, y1):
    """A polygon covering grid x in [x0, x1], y in [y0, y1], in EPSG:3978."""
    lon0, lat1 = grid_to_lonlat(x0, y0)
    lon1, lat0 = grid_to_lonlat(x1, y1)
    return reproject(shapely.segmentize(box(float(lon0), float(lat0), float(lon1), float(lat1)), 0.005), to_3978())


def pt_at(x, y, d=date(2024, 4, 20), source="VIIRS_SNPP_SP"):
    """A cleaned-looking FIRMS point at grid (x, y)."""
    lon, lat = grid_to_lonlat(x, y)
    return Point(d, 1000, float(lat), float(lon), source, "N", "n", 0, float(x), float(y))
