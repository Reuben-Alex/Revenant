"""GIBS WMS frames (Requirement 5.1; gibs-imagery skill). None on any failure, never a fake frame."""

import os
from datetime import date, timedelta
from pathlib import Path
from typing import Literal
from urllib.parse import urlencode

from .config import CACHE_DIR, GIBS_BBOX, GIBS_FRESH_DAYS, GIBS_WMS, GRID_H, GRID_W
from .http import Client, HttpError

Fmt = Literal["png", "jpeg"]
PNG_SIG = b"\x89PNG\r\n\x1a\n"
JPEG_SIG = b"\xff\xd8\xff"


def is_image(body: bytes, fmt: Fmt) -> bool:
    return body.startswith(PNG_SIG if fmt == "png" else JPEG_SIG)


def frame_url(layer: str, day: date, fmt: Fmt, base: str = GIBS_WMS) -> str:
    params = {
        "SERVICE": "WMS", "REQUEST": "GetMap", "VERSION": "1.3.0", "CRS": "EPSG:4326",
        "BBOX": GIBS_BBOX, "WIDTH": GRID_W, "HEIGHT": GRID_H,
        "FORMAT": f"image/{fmt}", "LAYERS": layer, "TIME": day.isoformat(),
    }
    if fmt == "png":
        params["TRANSPARENT"] = "TRUE"
    return f"{base}?{urlencode(params, safe=',:/')}"


class Gibs:
    def __init__(self, client: Client, *, today: date, cache_dir: Path | None = None, base: str = GIBS_WMS) -> None:
        self.client, self.today, self.base = client, today, base
        self.cache_dir = (CACHE_DIR / "gibs") if cache_dir is None else cache_dir

    def cache_path(self, layer: str, day: date, fmt: Fmt) -> Path:
        return self.cache_dir / layer / f"{day.isoformat()}.{'png' if fmt == 'png' else 'jpg'}"

    def frame(self, layer: str, day: date, fmt: Fmt) -> bytes | None:
        """Frame bytes, or None if it can't be fetched or isn't an image (e.g. a WMS error document)."""
        path = self.cache_path(layer, day, fmt)
        if path.exists():
            return path.read_bytes()
        try:
            body = self.client.get(
                frame_url(layer, day, fmt, self.base),
                label=f"GIBS {layer} {day.isoformat()}",
                valid=lambda b: None if is_image(b, fmt) else "not an image",
            )
        except HttpError:
            return None
        if day <= self.today - timedelta(days=GIBS_FRESH_DAYS):
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_name(path.name + ".tmp")
            tmp.write_bytes(body)
            os.replace(tmp, path)
        return body
