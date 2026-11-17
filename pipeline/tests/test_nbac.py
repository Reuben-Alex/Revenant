"""NBAC: download + cache, read, reproject, clip (Requirements 3.2, 3.7). Uses a tiny shapefile built in the test."""

import io
import zipfile
from pathlib import Path

import pytest
import shapefile
from pyproj import CRS

from pipeline.grid import from_3978, reproject
from pipeline.http import Client
from pipeline.nbac import Nbac, NbacError, read_fires, zip_name
from pipeline.tests.fakes import FakeClock, FakeResponse, FakeSession

INSIDE = [(-118.0, 57.0), (-117.9, 57.0), (-117.9, 57.1), (-118.0, 57.1), (-118.0, 57.0)]
STRADDLE = [(-109.2, 55.0), (-108.8, 55.0), (-108.8, 55.2), (-109.2, 55.2), (-109.2, 55.0)]  # crosses E edge
OUTSIDE = [(-100.0, 50.0), (-99.9, 50.0), (-99.9, 50.1), (-100.0, 50.1), (-100.0, 50.0)]


def make_zip(path: Path, polygons, crs: str = "EPSG:4326", prj: bool = True) -> Path:
    stem = path.parent / "src" / "NBAC_test"
    stem.parent.mkdir(parents=True, exist_ok=True)
    w = shapefile.Writer(str(stem), shapeType=shapefile.POLYGON)
    w.field("NFIREID", "N")
    for i, ring in enumerate(polygons):
        w.poly([ring])
        w.record(i + 1)
    w.close()
    if prj:
        stem.with_suffix(".prj").write_text(CRS(crs).to_wkt("WKT1_ESRI"), encoding="utf-8")
    with zipfile.ZipFile(path, "w") as z:
        for f in stem.parent.iterdir():
            z.write(f, f"NBAC_test/{f.name}")
    return path


def test_reads_reprojects_and_clips(tmp_path: Path) -> None:
    fires = read_fires(make_zip(tmp_path / "NBAC_2023_x.zip", [INSIDE, STRADDLE, OUTSIDE]), 2023)
    assert [f.record["NFIREID"] for f in fires] == [1, 2]
    lonlat = [reproject(f.geometry, from_3978()) for f in fires]
    x0, y0, x1, y1 = lonlat[0].bounds
    assert abs(x0 + 118.0) < 1e-6 and abs(y1 - 57.1) < 1e-6  # inside: unchanged
    assert lonlat[1].bounds[2] <= -109.0 + 1e-6  # straddling: clipped at the east edge
    assert fires[0].geometry.area > 1e7  # EPSG:3978 square metres (~6 km x 11 km)


def test_reads_projected_source_crs(tmp_path: Path) -> None:
    # same polygon stored in EPSG:3978 instead of lon/lat
    from pipeline.grid import to_3978

    ring = [tuple(map(float, to_3978().transform(x, y))) for x, y in INSIDE]
    fires = read_fires(make_zip(tmp_path / "z.zip", [ring], crs="EPSG:3978"), 2024)
    assert len(fires) == 1
    assert abs(reproject(fires[0].geometry, from_3978()).bounds[0] + 118.0) < 1e-6


def test_missing_prj_fails(tmp_path: Path) -> None:
    with pytest.raises(NbacError, match="prj"):
        read_fires(make_zip(tmp_path / "z.zip", [INSIDE], prj=False), 2023)


def test_bad_zip_fails(tmp_path: Path) -> None:
    p = tmp_path / "bad.zip"
    p.write_bytes(b"not a zip")
    with pytest.raises(NbacError, match="cannot extract"):
        read_fires(p, 2023)


def test_download_once_then_cache(tmp_path: Path) -> None:
    data = make_zip(tmp_path / "built.zip", [INSIDE]).read_bytes()
    clock = FakeClock()
    s = FakeSession(route=lambda u: FakeResponse(200, chunks=[data]))
    n = Nbac(Client(s, sleep=clock.sleep, clock=clock, interval=0), cache_dir=tmp_path / "cache")
    assert len(n.fires(2023)) == 1
    assert len(n.fires(2023)) == 1
    assert s.urls == [f"https://cwfis.cfs.nrcan.gc.ca/downloads/nbac/{zip_name(2023)}"]


def test_failed_download_raises_nbac_error(tmp_path: Path) -> None:
    clock = FakeClock()
    s = FakeSession(route=lambda u: FakeResponse(404))
    n = Nbac(Client(s, sleep=clock.sleep, clock=clock, interval=0), cache_dir=tmp_path)
    with pytest.raises(NbacError, match="HTTP 404"):
        n.fires(2024)
    assert list(tmp_path.iterdir()) == []
