"""Client: throttle, retries, redaction, download (Requirements 1.5–1.7)."""

import logging
from pathlib import Path

import pytest
import requests

from pipeline.http import Client, HttpError, RateLimited
from pipeline.tests.fakes import FakeClock, FakeResponse, FakeSession

SECRET = "s3cr3tKEYs3cr3tKEYs3cr3tKEY0000"


def client(session, clock=None, **kw):
    clock = clock or FakeClock()
    return Client(session, secrets=(SECRET,), sleep=clock.sleep, clock=clock, **kw), clock


def test_success_first_try() -> None:
    c, clock = client(FakeSession(queue=[FakeResponse(200, b"ok")]))
    assert c.get("https://x/" + SECRET, label="t") == b"ok"
    assert clock.slept == [] and c.requests_made == 1


def test_throttle_spaces_requests_one_second_apart() -> None:
    c, clock = client(FakeSession(queue=[FakeResponse(200, b"a"), FakeResponse(200, b"b")]))
    c.get("https://x/1", label="t")
    clock.t += 0.25
    c.get("https://x/2", label="t")
    assert clock.slept == [pytest.approx(0.75)]


def test_retries_with_backoff_then_succeeds() -> None:
    s = FakeSession(queue=[FakeResponse(503), requests.ConnectionError("boom"), FakeResponse(200, b"ok")])
    c, clock = client(s, interval=0)
    assert c.get("https://x", label="t") == b"ok"
    assert clock.slept == [2, 8]
    assert len(s.urls) == 3


def test_gives_up_after_four_attempts() -> None:
    s = FakeSession(route=lambda u: FakeResponse(500))
    c, clock = client(s, interval=0)
    with pytest.raises(HttpError, match=r"failed after 4 attempts \(HTTP 500\)"):
        c.get("https://x", label="t")
    assert clock.slept == [2, 8, 30] and len(s.urls) == 4


def test_client_error_is_not_retried() -> None:
    s = FakeSession(route=lambda u: FakeResponse(404))
    c, _ = client(s, interval=0)
    with pytest.raises(HttpError, match="HTTP 404"):
        c.get("https://x", label="t")
    assert len(s.urls) == 1


def test_429_is_not_retried() -> None:
    s = FakeSession(route=lambda u: FakeResponse(429))
    c, _ = client(s, interval=0)
    with pytest.raises(RateLimited):
        c.get("https://x", label="t")
    assert len(s.urls) == 1


def test_invalid_body_is_retried_then_fails() -> None:
    s = FakeSession(route=lambda u: FakeResponse(200, b"<xml>error</xml>"))
    c, _ = client(s, interval=0)
    with pytest.raises(HttpError, match="not good"):
        c.get("https://x", label="t", valid=lambda b: "not good")
    assert len(s.urls) == 4


def test_secret_is_redacted_from_every_failure(caplog) -> None:
    caplog.set_level(logging.DEBUG)
    url = f"https://firms/api/area/csv/{SECRET}/VIIRS_SNPP_SP/x/5/2024-03-21"
    s = FakeSession(route=lambda u: requests.ConnectionError(f"Max retries exceeded with url: {u}"))
    c, _ = client(s, interval=0)
    with pytest.raises(HttpError) as err:
        c.get(url, label=f"label {SECRET}")
    import traceback

    text = str(err.value) + repr(err.value) + "".join(traceback.format_exception(err.value)) + caplog.text
    assert SECRET not in text and "<redacted>" in str(err.value)
    assert err.value.__cause__ is None and err.value.__context__ is None


def test_download_writes_file_via_temp(tmp_path: Path) -> None:
    s = FakeSession(queue=[FakeResponse(200, chunks=[b"abc", b"def"])])
    c, _ = client(s, interval=0)
    out = c.download("https://x/f.zip", tmp_path / "f.zip", label="t")
    assert out.read_bytes() == b"abcdef"
    assert not (tmp_path / "f.zip.part").exists()


def test_failed_download_leaves_nothing(tmp_path: Path) -> None:
    s = FakeSession(route=lambda u: FakeResponse(200, chunks=[b"abc"], fail_mid_stream=True))
    c, _ = client(s, interval=0)
    with pytest.raises(HttpError):
        c.download("https://x/f.zip", tmp_path / "f.zip", label="t")
    assert list(tmp_path.iterdir()) == []


def test_download_retries_mid_stream_failure(tmp_path: Path) -> None:
    s = FakeSession(queue=[FakeResponse(200, chunks=[b"ab"], fail_mid_stream=True), FakeResponse(200, chunks=[b"xyz"])])
    c, _ = client(s, interval=0)
    assert c.download("https://x/f.zip", tmp_path / "f.zip", label="t").read_bytes() == b"xyz"
