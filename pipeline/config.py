"""Pipeline configuration (spec 02, design.md). Constants only, plus FIRMS key loading.

Values come from docs/method.md, the firms-points and gibs-imagery skills, and the spec 02 design.
Nothing here reads the environment at import time.
"""

import os
from collections.abc import Mapping
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = REPO_ROOT / "pipeline" / "cache"  # gitignored

# --- Region and grid (docs/method.md) ---------------------------------------------------------
WEST, SOUTH, EAST, NORTH = -126.0, 54.0, -109.0, 60.0
FIRMS_AREA = "-126,54,-109,60"  # W,S,E,N (firms-points skill)
GIBS_BBOX = "54,-126,60,-109"  # WMS 1.3.0 EPSG:4326 order lat,lon (gibs-imagery skill)
GRID_W, GRID_H = 1060, 716

# --- Seasons (spec 01 / data/seasons.json) ----------------------------------------------------
REPLAY_YEARS = (2024, 2025, 2026)
SEASON_DAYS = 103  # day 0 = Mar 21 (UTC) .. day 102 = Jul 1


def season_start(year: int) -> date:
    return date(year, 3, 21)


# --- FIRMS (firms-points skill; availability checked 2026-11-11) -------------------------------
FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov"
SP_SOURCES = ("VIIRS_SNPP_SP", "VIIRS_NOAA20_SP", "VIIRS_NOAA21_SP")
NRT_SOURCES = ("VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT")
MAX_DAY_RANGE = 5
KEEP_CONFIDENCE = frozenset({"n", "h"})
DROP_SP_TYPES = frozenset({2, 3})  # 2 = static land source, 3 = offshore
RECUR_CELL_DEG = 0.004  # ~375 m cell
RECUR_MIN_YEARS, RECUR_YEARS = 3, 4  # NRT static filter: >= 3 of the last 4 complete years

# --- GIBS (gibs-imagery skill; layers checked 2026-11-11) --------------------------------------
GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
LAYERS = {
    "replay": {
        "snow": "VIIRS_SNPP_NDSI_Snow_Cover",
        "cloud": "VIIRS_SNPP_Cloud_Top_Height_Day",
        "true_colour": "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    },
    "tonight": {  # S-NPP stopped delivering after 2026-11-02
        "snow": "VIIRS_NOAA20_NDSI_Snow_Cover",
        "cloud": "VIIRS_NOAA20_Cloud_Top_Height_Day",
        "true_colour": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    },
}
REGION_SNOW_MIN_PX = 2000  # snow frame below this is missing for every scar (docs/method.md)
CLOUD_MAX_SHARE = 0.5  # a scar more than half cloud is missing that day
KEYFRAME_DAYS = 5
CLOUD_BRIGHTNESS = 165  # keyframe cloud score: bright pixels that are not snow
BLACK_MAX_SHARE = 0.05  # swath gaps
WEBP_QUALITY = 72
CREDIT_GIBS = "NASA GIBS · VIIRS"

# --- NBAC (checked 2026-11-11 at https://cwfis.cfs.nrcan.gc.ca/downloads/nbac/) ----------------
NBAC_BASE = "https://cwfis.cfs.nrcan.gc.ca/downloads/nbac"
NBAC_RELEASE = "20260513"
NBAC_YEARS = (2023, 2024, 2025)

# --- Rule inputs prepared by the pipeline (spec 02 design) ------------------------------------
PROXIMITY_M = 1000.0  # on the scar: within 1 km (honesty.md)
N_GRAVES = 24
HULL_DILATE_PX = 2
NEW_FIRE_MIN_PX = 15
NEW_FIRE_DILATE_PX = 3
N_NEW_FIRES = 24
CHANCE_OFFSETS = 30
CHANCE_ATTEMPTS = 300
CHANCE_DX, CHANCE_DY = 200, 150

# --- Tonight ---------------------------------------------------------------------------------
LATE_HITS_DAYS = 14
SNOW_NOW_DAYS = 3
CLUSTER_DAYS = 7
N_CLUSTERS = 30

# --- HTTP ------------------------------------------------------------------------------------
REQUEST_INTERVAL_S = 1.0
RETRY_WAITS_S = (2, 8, 30)

CREDIT = "NASA FIRMS · NASA GIBS/VIIRS · NBAC (NRCan) · Scholten et al. 2021"


# --- FIRMS key -------------------------------------------------------------------------------
class KeyMissing(RuntimeError):
    pass


KEY_NAME = "FIRMS_MAP_KEY"


def _from_dotenv(path: Path) -> str | None:
    if not path.is_file():
        return None
    for line in path.read_text(encoding="utf-8").splitlines():
        name, sep, value = line.strip().partition("=")
        if sep and name.strip() == KEY_NAME:
            value = value.strip().strip('"').strip("'")
            return value or None
    return None


def firms_key(environ: Mapping[str, str] | None = None, dotenv: Path | None = None) -> str:
    """Return the FIRMS map key: environment variable first, then the repo-root .env file.

    Raises KeyMissing with a message naming both places. The message never contains a key.
    """
    env = os.environ if environ is None else environ
    value = (env.get(KEY_NAME) or "").strip()
    if value:
        return value
    value = _from_dotenv(REPO_ROOT / ".env" if dotenv is None else dotenv)
    if value:
        return value
    raise KeyMissing(
        f"{KEY_NAME} not set: add it as an environment variable, or as a {KEY_NAME}=... line in "
        f"{REPO_ROOT / '.env'} (gitignored)"
    )
