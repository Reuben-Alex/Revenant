"""Snow on each scar (Requirements 5.1–5.5; gibs-imagery skill; design.md "Snow"). Pure: frames in, fractions out.

Per scar pixel and day:  snow  = opaque in the NDSI snow frame (snow wins over cloud);
                         cloud = not snow, opaque in Cloud_Top_Height_Day, and bright (mean RGB > 165) or
                                 black (swath gap) in true colour; see `cloud_frame` (state unknown);
                         clear = neither.
fraction = snow / (snow + clear). A day is missing (None):
  - for one scar, when more than 50 % of its pixels are cloud;
  - for every scar, when the snow frame has < 2000 opaque pixels region-wide, or a frame failed.
`use_cloud_mask=False` reproduces the research method (fraction = snow / all scar pixels) for the
comparison report (Requirement 12.6).
"""

import io
import math
from collections.abc import Sequence

import numpy as np
from PIL import Image, UnidentifiedImageError

from .config import CLOUD_BRIGHTNESS, CLOUD_MAX_SHARE, GRID_H, GRID_W, REGION_SNOW_MIN_PX

Frame = np.ndarray | None  # bool (H, W): True = opaque


def opaque(png: bytes | None, shape: tuple[int, int] = (GRID_H, GRID_W)) -> Frame:
    """Opaque-pixel mask of a GIBS PNG, or None if it's missing, unreadable or the wrong size."""
    if png is None:
        return None
    try:
        with Image.open(io.BytesIO(png)) as im:
            if (im.height, im.width) != shape:
                return None
            alpha = np.asarray(im.convert("RGBA"))[..., 3]
    except (UnidentifiedImageError, OSError, ValueError):
        return None
    return alpha > 0


BLACK_MAX_RGB = 8  # every channel below this = swath gap (no imagery), as in the keyframe black-pixel test


def cloud_frame(cloud_png: bytes | None, true_colour_jpeg: bytes | None,
                shape: tuple[int, int] = (GRID_H, GRID_W)) -> Frame:
    """Option-3 cloud mask (design.md, Snow): Cloud_Top_Height opaque AND the true-colour pixel is bright
    (mean RGB > 165, gibs-imagery skill) or black (swath gap). None if either frame is unusable."""
    top = opaque(cloud_png, shape)
    if top is None or true_colour_jpeg is None:
        return None
    try:
        with Image.open(io.BytesIO(true_colour_jpeg)) as im:
            if (im.height, im.width) != shape:
                return None
            rgb = np.asarray(im.convert("RGB"), dtype=np.uint16)
    except (UnidentifiedImageError, OSError, ValueError):
        return None
    bright = rgb.sum(axis=2) > 3 * CLOUD_BRIGHTNESS
    black = (rgb < BLACK_MAX_RGB).all(axis=2)
    return top & (bright | black)


def region_missing(snow: Frame, cloud: Frame, use_cloud_mask: bool = True,
                   min_px: int = REGION_SNOW_MIN_PX) -> bool:
    """True when the whole day is missing for every scar."""
    if snow is None or int(snow.sum()) < min_px:
        return True
    return use_cloud_mask and cloud is None


def fraction(mask: np.ndarray, snow: Frame, cloud: Frame, use_cloud_mask: bool = True,
             min_px: int = REGION_SNOW_MIN_PX) -> float | None:
    """Snow fraction of one scar on one day, or None when missing."""
    if region_missing(snow, cloud, use_cloud_mask, min_px):
        return None
    n = int(mask.sum())
    if n == 0:
        return None
    s = int((mask & snow).sum())
    if not use_cloud_mask:
        return s / n
    c = int((mask & cloud & ~snow).sum())
    if c > CLOUD_MAX_SHARE * n:
        return None
    return s / (n - c)  # n - c = snow + clear > 0 here


def series(mask: np.ndarray, days: Sequence[tuple[Frame, Frame]], use_cloud_mask: bool = True,
           min_px: int = REGION_SNOW_MIN_PX) -> tuple[float | None, ...]:
    """Daily fractions for one scar; `days` holds (snow, cloud) frames per season day."""
    return tuple(fraction(mask, s, c, use_cloud_mask, min_px) for s, c in days)


def table(masks: Sequence[np.ndarray], days: Sequence[tuple[Frame, Frame]], use_cloud_mask: bool = True,
          min_px: int = REGION_SNOW_MIN_PX) -> list[tuple[float | None, ...]]:
    """`series` for many scars at once; same results, frames are only scanned once per day."""
    idx = [np.flatnonzero(m) for m in masks]
    out: list[list[float | None]] = [[] for _ in masks]
    for s, c in days:
        if region_missing(s, c, use_cloud_mask, min_px):
            for col in out:
                col.append(None)
            continue
        sf = s.ravel()
        unknown = (c.ravel() & ~sf) if use_cloud_mask else None
        for k, ix in enumerate(idx):
            n = len(ix)
            if n == 0:
                out[k].append(None)
                continue
            snow_px = int(sf[ix].sum())
            if unknown is None:
                out[k].append(snow_px / n)
                continue
            cloud_px = int(unknown[ix].sum())
            out[k].append(None if cloud_px > CLOUD_MAX_SHARE * n else snow_px / (n - cloud_px))
    return [tuple(col) for col in out]


def to_percent(value: float | None) -> int:
    """Whole percent, half up; -1 for missing (published schema).

    value * 100 is first rounded to 9 decimals, so float noise (0.145 * 100 = 14.499999999999998)
    does not turn a true half into a round-down.
    """
    return -1 if value is None else int(math.floor(round(value * 100, 9) + 0.5))


def percent_string(values: Sequence[float | None]) -> str:
    return ",".join(str(to_percent(v)) for v in values)
