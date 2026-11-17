"""NBAC annual burned-area polygons (Requirements 3.2, 3.7). Source: NRCan CWFIS, release in config.NBAC_RELEASE.

The national zip is downloaded once into pipeline/cache/nbac/ and extracted next to it. Polygons are read
with pyshp, reprojected from the file's own .prj to EPSG:3978 and clipped to the Revenant bbox.
Any failure raises NbacError; the caller must not fall back to hulls for an NBAC year.
"""

import shutil
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import shapefile  # pyshp
import shapely
from pyproj import CRS, Transformer
from shapely.geometry import shape as to_shape

from .config import CACHE_DIR, NBAC_BASE, NBAC_RELEASE
from .grid import bbox_lonlat, reproject
from .http import Client, HttpError


class NbacError(RuntimeError):
    pass


@dataclass(frozen=True)
class NbacFire:
    year: int
    record: dict = field(compare=False)
    geometry: shapely.Geometry  # EPSG:3978, clipped to the bbox


def zip_name(year: int, release: str = NBAC_RELEASE) -> str:
    return f"NBAC_{year}_{release}.zip"


class Nbac:
    def __init__(self, client: Client, *, cache_dir: Path | None = None, base: str = NBAC_BASE,
                 release: str = NBAC_RELEASE) -> None:
        self.client, self.base, self.release = client, base, release
        self.cache_dir = (CACHE_DIR / "nbac") if cache_dir is None else cache_dir

    def zip_path(self, year: int) -> Path:
        """Cached zip for `year`, downloading it the first time."""
        path = self.cache_dir / zip_name(year, self.release)
        if path.exists():
            return path
        try:
            return self.client.download(f"{self.base}/{path.name}", path, label=f"NBAC {path.name}")
        except HttpError as e:
            raise NbacError(str(e)) from None

    def fires(self, year: int) -> list[NbacFire]:
        return read_fires(self.zip_path(year), year)


def _extract(zip_path: Path) -> Path:
    out = zip_path.with_suffix("")
    if out.is_dir():
        return out
    tmp = out.with_name(out.name + ".part")
    shutil.rmtree(tmp, ignore_errors=True)
    try:
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(tmp)
    except (zipfile.BadZipFile, OSError) as e:
        shutil.rmtree(tmp, ignore_errors=True)
        raise NbacError(f"{zip_path.name}: cannot extract ({e})") from None
    tmp.rename(out)
    return out


def read_fires(zip_path: Path, year: int) -> list[NbacFire]:
    """All NBAC fire polygons for `year` that touch the bbox, in EPSG:3978, clipped to the bbox."""
    folder = _extract(zip_path)
    shps = sorted(folder.rglob("*.shp"))
    if len(shps) != 1:
        raise NbacError(f"{zip_path.name}: expected one .shp, found {len(shps)}")
    shp = shps[0]
    prj = shp.with_suffix(".prj")
    if not prj.exists():
        raise NbacError(f"{zip_path.name}: no .prj next to {shp.name}")
    src = CRS.from_wkt(prj.read_text(encoding="utf-8", errors="replace"))
    to_src = Transformer.from_crs("EPSG:4326", src, always_xy=True)
    to_3978 = Transformer.from_crs(src, "EPSG:3978", always_xy=True)
    region_src = reproject(bbox_lonlat(), to_src)
    region_3978 = reproject(bbox_lonlat(), Transformer.from_crs("EPSG:4326", "EPSG:3978", always_xy=True))
    rx0, ry0, rx1, ry1 = region_src.bounds

    out: list[NbacFire] = []
    try:
        with shapefile.Reader(str(shp)) as reader:
            for sr in reader.iterShapeRecords():
                if sr.shape.shapeType == shapefile.NULL:
                    continue
                x0, y0, x1, y1 = sr.shape.bbox
                if x1 < rx0 or x0 > rx1 or y1 < ry0 or y0 > ry1:
                    continue  # cheap reject before building geometry
                geom = shapely.make_valid(to_shape(sr.shape.__geo_interface__))
                if not geom.intersects(region_src):
                    continue
                geom = reproject(geom, to_3978).intersection(region_3978)
                geom = shapely.make_valid(geom)
                polys = [g for g in getattr(geom, "geoms", [geom]) if g.geom_type in ("Polygon", "MultiPolygon")]
                if not polys:
                    continue
                geom = shapely.union_all(polys)
                if geom.is_empty or geom.area <= 0:
                    continue
                out.append(NbacFire(year=year, record=sr.record.as_dict(), geometry=geom))
    except shapefile.ShapefileException as e:
        raise NbacError(f"{shp.name}: {e}") from None
    return out
