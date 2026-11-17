"""GIBS frames: URL, image check, cache, freshness (Requirement 5.1)."""

from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from pipeline.gibs import Gibs, frame_url, is_image
from pipeline.http import Client
from pipeline.tests.fakes import FakeClock, FakeResponse, FakeSession

PNG = b"\x89PNG\r\n\x1a\n" + b"\0" * 20
JPG = b"\xff\xd8\xff\xe0" + b"\0" * 20
TODAY = date(2026, 11, 11)


def make(tmp_path: Path, route):
    clock = FakeClock()
    s = FakeSession(route=route)
    return Gibs(Client(s, sleep=clock.sleep, clock=clock, interval=0), today=TODAY, cache_dir=tmp_path), s


def test_url_matches_skill() -> None:
    q = parse_qs(urlsplit(frame_url("VIIRS_SNPP_NDSI_Snow_Cover", date(2024, 4, 10), "png")).query)
    assert q["BBOX"] == ["54,-126,60,-109"] and q["CRS"] == ["EPSG:4326"] and q["VERSION"] == ["1.3.0"]
    assert q["WIDTH"] == ["1060"] and q["HEIGHT"] == ["716"] and q["TRANSPARENT"] == ["TRUE"]
    assert q["FORMAT"] == ["image/png"] and q["TIME"] == ["2024-04-10"]
    q = parse_qs(urlsplit(frame_url("VIIRS_SNPP_CorrectedReflectance_TrueColor", date(2024, 4, 10), "jpeg")).query)
    assert q["FORMAT"] == ["image/jpeg"] and "TRANSPARENT" not in q


def test_is_image() -> None:
    assert is_image(PNG, "png") and is_image(JPG, "jpeg")
    assert not is_image(JPG, "png") and not is_image(b"<?xml ServiceException", "jpeg")


def test_old_frame_is_cached(tmp_path: Path) -> None:
    g, s = make(tmp_path, lambda u: FakeResponse(200, PNG))
    assert g.frame("L", date(2024, 4, 10), "png") == PNG
    assert g.frame("L", date(2024, 4, 10), "png") == PNG
    assert len(s.urls) == 1


def test_recent_frame_is_not_cached(tmp_path: Path) -> None:
    g, s = make(tmp_path, lambda u: FakeResponse(200, JPG))
    g.frame("L", date(2026, 11, 10), "jpeg")  # yesterday: GIBS may still add swaths
    g.frame("L", date(2026, 11, 10), "jpeg")
    assert len(s.urls) == 2
    g.frame("L", date(2026, 11, 9), "jpeg")  # two days old: cached
    g.frame("L", date(2026, 11, 9), "jpeg")
    assert len(s.urls) == 3


def test_error_document_gives_none_and_no_cache(tmp_path: Path) -> None:
    g, _ = make(tmp_path, lambda u: FakeResponse(200, b"<?xml version='1.0'?><ServiceExceptionReport/>"))
    assert g.frame("L", date(2024, 4, 10), "png") is None
    assert list(tmp_path.rglob("*.png")) == []


def test_http_failure_gives_none(tmp_path: Path) -> None:
    g, _ = make(tmp_path, lambda u: FakeResponse(503))
    assert g.frame("L", date(2024, 4, 10), "jpeg") is None
