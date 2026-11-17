"""Latest low-cloud true-colour frame (Requirements 9.3, 9.4; gibs-imagery skill).

cloud score = share of all pixels that are bright (mean RGB > 165) and not snow; frames with more
than 5 % black pixels (swath gaps) are skipped. The lowest score wins; on a tie, the latest day.
"""

import io
from collections.abc import Sequence
from datetime import date

import numpy as np
from PIL import Image, UnidentifiedImageError

from .config import BLACK_MAX_SHARE, CLOUD_BRIGHTNESS, GRID_H, GRID_W, WEBP_QUALITY
from .snow import BLACK_MAX_RGB, opaque


def _rgb(jpeg: bytes | None, shape=(GRID_H, GRID_W)) -> np.ndarray | None:
    if jpeg is None:
        return None
    try:
        with Image.open(io.BytesIO(jpeg)) as im:
            if (im.height, im.width) != shape:
                return None
            return np.asarray(im.convert("RGB"), dtype=np.uint16)
    except (UnidentifiedImageError, OSError, ValueError):
        return None


def score(true_colour: bytes | None, snow_png: bytes | None, shape=(GRID_H, GRID_W)) -> float | None:
    """Cloud score, or None when the frame is unusable (missing, wrong size, > 5 % black)."""
    rgb = _rgb(true_colour, shape)
    if rgb is None:
        return None
    if (rgb < BLACK_MAX_RGB).all(axis=2).mean() > BLACK_MAX_SHARE:
        return None
    snow = opaque(snow_png, shape)
    bright = rgb.sum(axis=2) > 3 * CLOUD_BRIGHTNESS
    if snow is not None:
        bright &= ~snow
    return float(bright.mean())


def pick(candidates: Sequence[tuple[date, bytes | None, bytes | None]], shape=(GRID_H, GRID_W)) -> tuple[date, bytes] | None:
    """(day, true-colour JPEG) of the best candidate, or None if none is usable."""
    best = None
    for day, tc, snow in candidates:
        s = score(tc, snow, shape)
        if s is None:
            continue
        if best is None or (s, -day.toordinal()) < (best[0], -best[1].toordinal()):
            best = (s, day, tc)
    return None if best is None else (best[1], best[2])


def to_webp(jpeg: bytes, quality: int = WEBP_QUALITY) -> bytes:
    with Image.open(io.BytesIO(jpeg)) as im:
        buf = io.BytesIO()
        im.convert("RGB").save(buf, "WEBP", quality=quality)
        return buf.getvalue()
