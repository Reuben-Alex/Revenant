"""FIRMS area API (Requirements 1.1–1.7; firms-points skill).

Every valid page is cached under pipeline/cache/firms/ and never fetched again. NRT pages may only
cover completed UTC days, so a cached NRT page is never a partial day. The key appears only in
request URLs, which the Client redacts from every error.
"""

import csv
import io
import json
import os
from datetime import date, timedelta
from pathlib import Path

from .config import (
    BUDGET_CHECK_EVERY,
    BUDGET_MARGIN,
    CACHE_DIR,
    FIRMS_AREA,
    FIRMS_BASE,
    MAX_DAY_RANGE,
)
from .http import Client

CSV_HEADER = "latitude,longitude"


class FirmsError(RuntimeError):
    pass


class BudgetExceeded(FirmsError):
    pass


def pages(first: date, last: date, max_days: int = MAX_DAY_RANGE) -> list[tuple[date, int]]:
    """(start, days) pages of at most `max_days` that cover first..last exactly once (Property 2)."""
    if last < first:
        raise ValueError(f"period ends before it starts: {first} .. {last}")
    out, d = [], first
    while d <= last:
        n = min(max_days, (last - d).days + 1)
        out.append((d, n))
        d += timedelta(days=n)
    return out


def check_csv(body: bytes) -> str | None:
    """None for a FIRMS CSV (even with 0 rows); a problem string otherwise. Raises on a limit message."""
    text = body.decode("utf-8", "replace").lstrip("\ufeff")
    first = text.split("\n", 1)[0].strip()
    if first.startswith(CSV_HEADER):
        return None
    low = text.lower()
    if "transaction" in low and "limit" in low:
        raise BudgetExceeded("FIRMS transaction limit reached; cached pages are kept, re-run later")
    return "body is not a FIRMS CSV"


def _check_status(body: bytes) -> str | None:
    try:
        j = json.loads(body)
        int(j["current_transactions"]), int(j["transaction_limit"])
    except (ValueError, KeyError, TypeError):
        return "key status is not the expected JSON"
    return None


def _write_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


class Firms:
    def __init__(
        self,
        client: Client,
        key: str,
        *,
        today: date,
        cache_dir: Path | None = None,
        base: str = FIRMS_BASE,
        area: str = FIRMS_AREA,
    ) -> None:
        if not key:
            raise FirmsError("empty FIRMS key")
        self.client, self._key, self.today = client, key, today
        client.add_secret(key)
        self.cache_dir = (CACHE_DIR / "firms") if cache_dir is None else cache_dir
        self.base, self.area = base, area
        self.fetched = 0  # pages fetched from the network this run

    # -- paths and URLs (cache paths never contain the key) --
    def cache_path(self, source: str, start: date, days: int) -> Path:
        return self.cache_dir / source / f"{start.isoformat()}_{days}d.csv"

    def _page_url(self, source: str, start: date, days: int) -> str:
        return f"{self.base}/api/area/csv/{self._key}/{source}/{self.area}/{days}/{start.isoformat()}"

    # -- budget --
    def budget(self) -> tuple[int, int]:
        """(transactions used in the current 10-minute window, limit)."""
        body = self.client.get(
            f"{self.base}/mapserver/mapkey_status/?MAP_KEY={self._key}",
            label="FIRMS key status",
            valid=_check_status,
        )
        j = json.loads(body)
        return int(j["current_transactions"]), int(j["transaction_limit"])

    def ensure_budget(self) -> None:
        used, limit = self.budget()
        if used + BUDGET_MARGIN > limit:
            raise BudgetExceeded(
                f"FIRMS budget: {used} of {limit} transactions used in the current 10-minute window "
                f"(margin {BUDGET_MARGIN}); stopping with the cache kept"
            )

    def availability(self) -> dict[str, tuple[date, date]]:
        """Date range each source covers, from /api/data_availability/ (not cached: it changes)."""
        body = self.client.get(
            f"{self.base}/api/data_availability/csv/{self._key}/all",
            label="FIRMS data availability",
            valid=lambda b: None if b"data_id" in b[:200] else "not an availability CSV",
        )
        out = {}
        for row in csv.DictReader(io.StringIO(body.decode("utf-8"))):
            out[row["data_id"]] = (date.fromisoformat(row["min_date"]), date.fromisoformat(row["max_date"]))
        return out

    # -- pages --
    def fetch_range(self, source: str, start: date, days: int) -> str:
        if not 1 <= days <= MAX_DAY_RANGE:
            raise ValueError(f"days must be 1..{MAX_DAY_RANGE}, got {days}")
        end = start + timedelta(days=days - 1)
        if source.endswith("_NRT") and end >= self.today:
            raise ValueError(f"{source} page {start}..{end} includes today or later ({self.today}); NRT pages must be completed UTC days")
        path = self.cache_path(source, start, days)
        if path.exists():
            return path.read_text(encoding="utf-8")
        if self.fetched % BUDGET_CHECK_EVERY == 0:
            self.ensure_budget()
        body = self.client.get(
            self._page_url(source, start, days),
            label=f"FIRMS {source} {start.isoformat()} +{days}d",
            valid=check_csv,
        )
        text = body.decode("utf-8").lstrip("\ufeff")
        _write_atomic(path, text)
        self.fetched += 1
        return text

    def fetch_period(self, source: str, first: date, last: date) -> list[str]:
        return [self.fetch_range(source, start, n) for start, n in pages(first, last)]
