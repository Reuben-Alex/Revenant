"""FIRMS paging, caching, NRT rule, CSV check and budget (Requirements 1.1–1.8), Properties 2 and 10."""

import json
import tempfile
import traceback
from datetime import date, timedelta
from pathlib import Path

import pytest
import requests
from hypothesis import given
from hypothesis import strategies as st

from pipeline.firms import BudgetExceeded, Firms, check_csv, pages
from pipeline.http import Client, HttpError
from pipeline.tests.fakes import FIRMS_HEADER, FakeClock, FakeResponse, FakeSession

KEY = "k" * 32
TODAY = date(2026, 11, 11)
ROW = b"57.1,-118.2,330.1,0.4,0.5,2024-05-10,835,N,VIIRS,n,2,290.0,3.2,N,0\n"


def status(used=0, limit=5000) -> FakeResponse:
    return FakeResponse(200, json.dumps({"transaction_limit": limit, "current_transactions": used,
                                         "transaction_interval": "10 minutes"}).encode())


def make(tmp_path: Path, route=None, queue=None, key=KEY):
    clock = FakeClock()
    s = FakeSession(route=route, queue=queue)
    c = Client(s, sleep=clock.sleep, clock=clock, interval=0)
    return Firms(c, key, today=TODAY, cache_dir=tmp_path), s


def router(page_body=FIRMS_HEADER + ROW, used=0):
    def route(url):
        if "mapkey_status" in url:
            return status(used)
        return FakeResponse(200, page_body)
    return route


# --- paging ------------------------------------------------------------------------------------

@given(st.dates(min_value=date(2012, 1, 1), max_value=date(2027, 12, 31)), st.integers(0, 400))
def test_property_2_pages_cover_period_exactly_once(first: date, span: int) -> None:
    """Property 2. Validates: Requirements 1.3."""
    last = first + timedelta(days=span)
    ps = pages(first, last)
    days = [s + timedelta(days=i) for s, n in ps for i in range(n)]
    assert days == [first + timedelta(days=i) for i in range(span + 1)]
    assert all(1 <= n <= 5 for _, n in ps)


def test_pages_for_a_season() -> None:
    ps = pages(date(2024, 3, 21), date(2024, 7, 1))  # 103 days
    assert len(ps) == 21 and ps[-1] == (date(2024, 6, 29), 3)  # 103 = 20 x 5 + 3


def test_pages_reject_reversed_period() -> None:
    with pytest.raises(ValueError):
        pages(date(2024, 3, 2), date(2024, 3, 1))


# --- URL, caching ------------------------------------------------------------------------------

def test_page_url_and_cache(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router())
    text = f.fetch_range("VIIRS_SNPP_SP", date(2024, 5, 10), 5)
    page_url = s.urls[-1]
    assert page_url == f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{KEY}/VIIRS_SNPP_SP/-126,54,-109,60/5/2024-05-10"
    assert text.startswith("latitude,longitude")
    n = len(s.urls)
    assert f.fetch_range("VIIRS_SNPP_SP", date(2024, 5, 10), 5) == text
    assert len(s.urls) == n  # served from cache, never re-fetched
    assert f.cache_path("VIIRS_SNPP_SP", date(2024, 5, 10), 5).exists()


def test_empty_but_valid_page_is_cached(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router(page_body=FIRMS_HEADER))
    assert f.fetch_range("VIIRS_NOAA20_SP", date(2024, 1, 1), 1) == FIRMS_HEADER.decode()
    assert f.cache_path("VIIRS_NOAA20_SP", date(2024, 1, 1), 1).exists()


def test_fetch_period_uses_five_day_pages(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router())
    out = f.fetch_period("VIIRS_SNPP_SP", date(2024, 3, 21), date(2024, 4, 1))  # 12 days
    page_urls = [u for u in s.urls if "/api/area/" in u]
    assert len(out) == 3 and [u.split("/")[-2] for u in page_urls] == ["5", "5", "2"]


@pytest.mark.parametrize("days", [0, 6])
def test_day_range_limits(tmp_path: Path, days: int) -> None:
    f, s = make(tmp_path, route=router())
    with pytest.raises(ValueError):
        f.fetch_range("VIIRS_SNPP_SP", date(2024, 5, 10), days)
    assert s.urls == []


# --- NRT completed days ------------------------------------------------------------------------

def test_nrt_must_end_before_today(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router())
    f.fetch_range("VIIRS_NOAA20_NRT", TODAY - timedelta(days=5), 5)  # ends yesterday: allowed
    n = len(s.urls)
    for start, days in [(TODAY, 1), (TODAY - timedelta(days=4), 5), (TODAY + timedelta(days=1), 1)]:
        with pytest.raises(ValueError, match="completed UTC days"):
            f.fetch_range("VIIRS_NOAA20_NRT", start, days)
    assert len(s.urls) == n  # nothing requested


def test_sp_is_not_limited_by_today(tmp_path: Path) -> None:
    f, _ = make(tmp_path, route=router())
    f.fetch_range("VIIRS_SNPP_SP", TODAY, 1)


# --- CSV check ---------------------------------------------------------------------------------

def test_check_csv() -> None:
    assert check_csv(FIRMS_HEADER) is None
    assert check_csv(b"\xef\xbb\xbf" + FIRMS_HEADER + ROW) is None
    assert check_csv(b"Invalid MAP_KEY.") == "body is not a FIRMS CSV"
    assert check_csv(b"") == "body is not a FIRMS CSV"
    with pytest.raises(BudgetExceeded):
        check_csv(b"Exceeding allowed transaction limit.")


def test_non_csv_page_fails_and_is_not_cached(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router(page_body=b"Invalid MAP_KEY."))
    with pytest.raises(HttpError, match="not a FIRMS CSV"):
        f.fetch_range("VIIRS_SNPP_SP", date(2024, 5, 10), 5)
    assert not f.cache_path("VIIRS_SNPP_SP", date(2024, 5, 10), 5).exists()
    assert sum("/api/area/" in u for u in s.urls) == 4  # 1 + 3 retries


def test_limit_message_stops_at_once(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router(page_body=b"Exceeding allowed transaction limit"))
    with pytest.raises(BudgetExceeded):
        f.fetch_range("VIIRS_SNPP_SP", date(2024, 5, 10), 5)
    assert sum("/api/area/" in u for u in s.urls) == 1


# --- budget ------------------------------------------------------------------------------------

def test_budget_reads_key_status(tmp_path: Path) -> None:
    f, _ = make(tmp_path, route=router(used=9))
    assert f.budget() == (9, 5000)


def test_budget_stop_before_first_page(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router(used=4800))
    with pytest.raises(BudgetExceeded, match="4800 of 5000"):
        f.fetch_range("VIIRS_SNPP_SP", date(2024, 5, 10), 5)
    assert not any("/api/area/" in u for u in s.urls)


def test_budget_rechecked_every_25_fresh_pages(tmp_path: Path) -> None:
    f, s = make(tmp_path, route=router())
    f.fetch_period("VIIRS_SNPP_SP", date(2024, 1, 1), date(2024, 1, 1) + timedelta(days=26 * 5 - 1))  # 26 pages
    assert sum("mapkey_status" in u for u in s.urls) == 2
    s.urls.clear()
    f.fetch_period("VIIRS_SNPP_SP", date(2024, 1, 1), date(2024, 1, 1) + timedelta(days=26 * 5 - 1))
    assert s.urls == []  # all cached: no pages and no status checks


def test_availability(tmp_path: Path) -> None:
    body = b"data_id,min_date,max_date\nVIIRS_SNPP_SP,2012-01-20,2026-07-31\nVIIRS_NOAA20_NRT,2026-08-01,2026-11-17\n"
    f, _ = make(tmp_path, queue=[FakeResponse(200, body)])
    assert f.availability()["VIIRS_SNPP_SP"] == (date(2012, 1, 20), date(2026, 7, 31))


# --- Property 10 -------------------------------------------------------------------------------

failures = st.sampled_from(["connection", "http500", "http404", "echo_body", "bad_status"])


@given(st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=16, max_size=40), failures)
def test_property_10_key_never_leaks(key: str, failure: str) -> None:
    """Property 10. Validates: Requirements 1.6."""

    def route(url):
        if failure == "bad_status" and "mapkey_status" in url:
            return FakeResponse(200, f"Invalid MAP_KEY {key}".encode())
        if "mapkey_status" in url:
            return status()
        return {
            "connection": requests.ConnectionError(f"Max retries exceeded with url: {url}"),
            "http500": FakeResponse(500),
            "http404": FakeResponse(404),
            "echo_body": FakeResponse(200, f"Invalid MAP_KEY: {key}".encode()),
        }.get(failure, FakeResponse(500))

    with tempfile.TemporaryDirectory() as d:
        f, _ = make(Path(d), route=route, key=key)
        with pytest.raises(HttpError) as err:
            f.fetch_range("VIIRS_SNPP_SP", date(2024, 5, 10), 5)
        text = str(err.value) + repr(err.value) + "".join(traceback.format_exception(err.value))
        assert key not in text
        assert all(key not in str(p) for p in Path(d).rglob("*"))


def test_property_10_cache_names_never_hold_key(tmp_path: Path) -> None:
    """Property 10 (cache side). Validates: Requirements 1.6."""
    f, _ = make(tmp_path, route=router())
    f.fetch_period("VIIRS_SNPP_SP", date(2024, 3, 21), date(2024, 4, 30))
    files = list(tmp_path.rglob("*"))
    assert files and all(KEY not in str(p) for p in files)
    assert all(KEY not in p.read_text(encoding="utf-8") for p in files if p.is_file())
