"""Writing published files (Requirements 3.6, 8.4). JSON goes temp file -> validator -> atomic replace.

Only this module writes into public/. If validation fails the temp file is removed and the
previously published file is left exactly as it was.
"""

import io
import json
import os
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from .config import GRID_H, GRID_W, REPO_ROOT

PUBLIC_DATA = REPO_ROOT / "public" / "data"
PUBLIC_IMG = REPO_ROOT / "public" / "img"
VALIDATOR = REPO_ROOT / "scripts" / "validate-data.mjs"


class PublishError(RuntimeError):
    pass


def _replace_atomic(tmp: Path, path: Path) -> None:
    os.replace(tmp, path)


def publish_json(data: dict, path: Path, kind: str, node: str | None = None) -> Path:
    """Write `data` to `path` only if scripts/validate-data.mjs accepts it."""
    node = node or shutil.which("node")
    if node is None:
        raise PublishError("node is not installed; it is needed to run scripts/validate-data.mjs")
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n",
                       encoding="utf-8")
        r = subprocess.run([node, str(VALIDATOR), "--kind", kind, str(tmp)], capture_output=True, text=True)
        if r.returncode != 0:
            raise PublishError(f"{path.name} failed validation; previous file kept:\n{(r.stderr or r.stdout).strip()}")
        _replace_atomic(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()
    return path


def mask_png(mask: np.ndarray) -> bytes:
    """1060×716 RGBA, white, alpha = scar footprint (same format as the research masks)."""
    if mask.shape != (GRID_H, GRID_W):
        raise ValueError(f"mask shape {mask.shape} is not {(GRID_H, GRID_W)}")
    rgba = np.zeros((GRID_H, GRID_W, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = np.where(mask, 255, 0).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buf, "PNG", optimize=True)
    return buf.getvalue()


def publish_bytes(data: bytes, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(data)
    _replace_atomic(tmp, path)
    return path
