"""FIRMS points: parse, de-duplicate and clean (Requirements 2.1–2.6; firms-points skill).

Pure functions over in-memory data. Malformed rows raise ValueError naming the source and row, so
a bad download never turns into silently missing fires.
"""

import csv
import io
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date

import numpy as np

from .config import DROP_SP_TYPES, KEEP_CONFIDENCE, RECUR_CELL_DEG, RECUR_MIN_YEARS
from .grid import in_bbox, lonlat_to_grid

REQUIRED = ("latitude", "longitude", "acq_date", "acq_time", "confidence", "satellite")
CONFIDENCE = frozenset({"l", "n", "h"})

Cell = tuple[int, int]


@dataclass(frozen=True)
class Point:
    acq_date: date  # UTC
    acq_time: int  # HHMM, UTC
    lat: float
    lon: float
    source: str  # e.g. "VIIRS_NOAA20_SP"
    satellite: str
    confidence: str  # "l" | "n" | "h"
    type: int | None  # SP only; None for NRT
    x: float  # grid x/y from grid.py
    y: float

    @property
    def is_nrt(self) -> bool:
        return self.source.endswith("_NRT")

    @property
    def key(self) -> tuple[float, float, date, int]:
        """De-duplication key (firms-points skill)."""
        return (self.lat, self.lon, self.acq_date, self.acq_time)

    @property
    def cell(self) -> Cell:
        """~375 m cell: lat/lon rounded to 0.004°."""
        return (round(self.lat / RECUR_CELL_DEG), round(self.lon / RECUR_CELL_DEG))


def parse(csv_text: str, source: str) -> list[Point]:
    """Parse one FIRMS area-API CSV page. SP pages have a `type` column; NRT pages don't."""
    reader = csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")))
    cols = reader.fieldnames or []
    missing = [c for c in REQUIRED if c not in cols]
    if missing:
        raise ValueError(f"{source}: CSV is missing columns {missing}")
    has_type = "type" in cols
    out: list[Point] = []
    for n, row in enumerate(reader, start=2):  # line 1 is the header
        try:
            lat, lon = float(row["latitude"]), float(row["longitude"])
            day = date.fromisoformat(row["acq_date"])
            hhmm = int(row["acq_time"])
            conf = row["confidence"].strip()
            if conf not in CONFIDENCE:
                raise ValueError(f"confidence {conf!r}")
            typ = int(row["type"]) if has_type else None
            if not (-90 <= lat <= 90 and -180 <= lon <= 180 and 0 <= hhmm <= 2359):
                raise ValueError("value out of range")
        except (TypeError, ValueError) as e:
            raise ValueError(f"{source}: bad row on line {n}: {e}") from None
        x, y = lonlat_to_grid(lon, lat)
        out.append(Point(day, hhmm, lat, lon, source, row["satellite"].strip(), conf, typ, float(x), float(y)))
    return out


def _order(p: Point) -> tuple:
    """Total order over points. `type` is None for NRT, so it can't be compared directly with SP ints."""
    return (p.acq_date, p.acq_time, p.lat, p.lon, p.source, p.satellite, p.confidence,
            -1 if p.type is None else p.type, p.x, p.y)


def dedupe(points: Iterable[Point]) -> list[Point]:
    """One point per (lat, lon, acq_date, acq_time). The smallest point by `_order` wins and the result
    is sorted, so the output does not depend on input order (Property 3)."""
    best: dict[tuple, Point] = {}
    for p in points:
        k = p.key
        if k not in best or _order(p) < _order(best[k]):
            best[k] = p
    return sorted(best.values(), key=_order)


def recurring_cells(points: Iterable[Point], years: Iterable[int], min_years: int = RECUR_MIN_YEARS) -> set[Cell]:
    """Cells with detections in at least `min_years` of `years` (NRT static filter, firms-points skill).

    Pass SP points clipped to the bbox but *not* cleaned: FIRMS-flagged type 2 flares must count here,
    or the filter would miss the very flares it exists for (design.md, Static sources).
    """
    wanted = set(years)
    seen: defaultdict[Cell, set[int]] = defaultdict(set)
    for p in points:
        if p.acq_date.year in wanted:
            seen[p.cell].add(p.acq_date.year)
    return {c for c, ys in seen.items() if len(ys) >= min_years}


def drop_reason(p: Point, recurring: set[Cell]) -> str | None:
    """Why `clean` drops a point (first matching step), or None to keep it."""
    if not bool(in_bbox(p.lon, p.lat)):
        return "bbox"
    if p.confidence not in KEEP_CONFIDENCE:
        return "confidence"
    if p.type is not None and p.type in DROP_SP_TYPES:
        return "type"
    if p.is_nrt and p.cell in recurring:
        return "recurring"
    return None


def clean_with_counts(points: Iterable[Point], recurring: set[Cell]) -> tuple[list[Point], Counter]:
    """Kept points plus a count per drop reason (for the comparison report, Requirement 12.3)."""
    kept, counts = [], Counter()
    for p in points:
        reason = drop_reason(p, recurring)
        if reason is None:
            kept.append(p)
        else:
            counts[reason] += 1
    return kept, counts


def clean(points: Iterable[Point], recurring: set[Cell]) -> list[Point]:
    return clean_with_counts(points, recurring)[0]


def csv_cells(csv_text: str) -> tuple[np.ndarray, np.ndarray]:
    """(year, encoded cell) arrays for every row of a FIRMS CSV inside the bbox, without building Points.

    Used for the full-year recurrence scan, where Point objects would not fit in memory. The cell is the
    same as `Point.cell`; see `encode_cell`.
    """
    reader = csv.reader(io.StringIO(csv_text.lstrip("\ufeff")))
    header = next(reader, None)
    if not header:
        return np.array([], dtype=np.int64), np.array([], dtype=np.int64)
    i_lat, i_lon, i_date = header.index("latitude"), header.index("longitude"), header.index("acq_date")
    lat, lon, year = [], [], []
    for row in reader:
        lat.append(float(row[i_lat]))
        lon.append(float(row[i_lon]))
        year.append(int(row[i_date][:4]))
    lat_a, lon_a, year_a = np.asarray(lat), np.asarray(lon), np.asarray(year, dtype=np.int64)
    keep = in_bbox(lon_a, lat_a) if len(lat) else np.array([], dtype=bool)
    return year_a[keep], encode_cell(lat_a[keep], lon_a[keep])


def encode_cell(lat, lon) -> np.ndarray:
    """Cells as one int64 each: same rounding as `Point.cell` (half to even, like Python's round)."""
    la = np.round(np.asarray(lat, dtype=float) / RECUR_CELL_DEG).astype(np.int64)
    lo = np.round(np.asarray(lon, dtype=float) / RECUR_CELL_DEG).astype(np.int64)
    return la * 1_000_000 + (lo + 500_000)


def decode_cell(key: int) -> Cell:
    return (int(key) // 1_000_000, int(key) % 1_000_000 - 500_000)


def recurring_from_keys(per_year: dict[int, np.ndarray], min_years: int = RECUR_MIN_YEARS) -> set[Cell]:
    """Cells present in at least `min_years` of the given years (keys from `encode_cell`)."""
    stacked = [np.unique(k) for k in per_year.values() if len(k)]
    if not stacked:
        return set()
    keys, counts = np.unique(np.concatenate(stacked), return_counts=True)
    return {decode_cell(k) for k in keys[counts >= min_years]}


def static_type_cells(points: Iterable[Point]) -> set[Cell]:
    """Distinct cells, inside the bbox, of SP points flagged type 2/3 (the published `static` for seasons)."""
    return {p.cell for p in points if p.type in DROP_SP_TYPES and bool(in_bbox(p.lon, p.lat))}
