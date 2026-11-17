"""HTTP for the pipeline (Requirements 1.5–1.7): one session, throttle, retries, secret redaction.

Every error message passes through `_redact`, and errors are raised outside `except` blocks, so no
exception chain carries a URL that contains the FIRMS key.
"""

import logging
import os
import time
from collections.abc import Callable
from pathlib import Path

import requests

from .config import HTTP_TIMEOUT_S, REQUEST_INTERVAL_S, RETRY_WAITS_S

# urllib3 logs full request lines (including the key in FIRMS URLs) at DEBUG. Never let that through.
logging.getLogger("urllib3").setLevel(logging.WARNING)

RETRYABLE_STATUS = frozenset({500, 502, 503, 504})


class HttpError(RuntimeError):
    """A request failed for good. The message never contains a registered secret."""


class RateLimited(HttpError):
    """HTTP 429: not retried, because retrying spends the same budget."""


class Client:
    def __init__(
        self,
        session: requests.Session | None = None,
        *,
        secrets: tuple[str, ...] = (),
        interval: float = REQUEST_INTERVAL_S,
        waits: tuple[float, ...] = RETRY_WAITS_S,
        timeout: float = HTTP_TIMEOUT_S,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.session = session if session is not None else requests.Session()
        self._secrets: list[str] = [s for s in secrets if s]
        self.interval, self.waits, self.timeout = interval, tuple(waits), timeout
        self.sleep, self.clock = sleep, clock
        self._last: float | None = None
        self.requests_made = 0

    def add_secret(self, secret: str) -> None:
        if secret and secret not in self._secrets:
            self._secrets.append(secret)

    def redact(self, text: str) -> str:
        for s in self._secrets:
            text = text.replace(s, "<redacted>")
        return text

    def _throttle(self) -> None:
        if self._last is not None:
            wait = self.interval - (self.clock() - self._last)
            if wait > 0:
                self.sleep(wait)
        self._last = self.clock()

    def _run(self, url: str, label: str, consume: Callable[[requests.Response], tuple[object, str | None]]):
        """Try 1 + len(waits) times. `consume` returns (result, problem); a problem means retry."""
        label = self.redact(label)
        attempts = 1 + len(self.waits)
        problem = ""
        for wait in (0, *self.waits):
            if wait:
                self.sleep(wait)
            self._throttle()
            self.requests_made += 1
            outcome: tuple[object, str | None] | None = None
            status = None
            try:
                r = self.session.get(url, timeout=self.timeout, stream=True)
                status = r.status_code
                if status == 200:
                    outcome = consume(r)
            except requests.RequestException as e:
                problem = f"{type(e).__name__}: {e}"
                continue
            if status == 429:
                raise RateLimited(self.redact(f"{label}: HTTP 429 (rate limited)"))
            if status in RETRYABLE_STATUS:
                problem = f"HTTP {status}"
                continue
            if status != 200:
                raise HttpError(self.redact(f"{label}: HTTP {status}"))
            result, problem_now = outcome
            if problem_now is None:
                return result
            problem = problem_now
        raise HttpError(self.redact(f"{label}: failed after {attempts} attempts ({problem})"))

    def get(self, url: str, *, label: str, valid: Callable[[bytes], str | None] | None = None) -> bytes:
        """GET the whole body. `valid(body)` returns a problem string to retry, or None to accept.
        `valid` may raise to stop at once; its message must not contain secrets."""

        def consume(r: requests.Response) -> tuple[object, str | None]:
            body = r.content
            return body, (valid(body) if valid is not None else None)

        return self._run(url, label, consume)  # type: ignore[return-value]

    def download(self, url: str, path: Path, *, label: str, chunk: int = 1 << 20) -> Path:
        """Stream a large file to `path` via a temporary file; a failed download leaves nothing behind."""
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_name(path.name + ".part")

        def consume(r: requests.Response) -> tuple[object, str | None]:
            with tmp.open("wb") as f:
                for block in r.iter_content(chunk):
                    f.write(block)
            if tmp.stat().st_size == 0:
                tmp.unlink()
                return None, "empty download"
            os.replace(tmp, path)
            return path, None

        try:
            return self._run(url, label, consume)  # type: ignore[return-value]
        finally:
            if tmp.exists():
                tmp.unlink()
