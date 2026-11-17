"""Fake HTTP session for offline tests: serves canned responses and records every requested URL."""

from collections.abc import Callable

import requests


class FakeResponse:
    def __init__(self, status: int = 200, body: bytes = b"", chunks: list[bytes] | None = None,
                 fail_mid_stream: bool = False) -> None:
        self.status_code = status
        self._body = body
        self._chunks = chunks
        self._fail = fail_mid_stream

    @property
    def content(self) -> bytes:
        return self._body

    def iter_content(self, size: int):
        for c in self._chunks if self._chunks is not None else [self._body]:
            yield c
        if self._fail:
            raise requests.ConnectionError("connection reset mid-stream")


Handler = Callable[[str], FakeResponse | Exception]


class FakeSession:
    """`route(url)` returns a FakeResponse, or an exception to raise. Or give a queue of responses."""

    def __init__(self, route: Handler | None = None, queue: list | None = None) -> None:
        self.route, self.queue, self.urls = route, list(queue or []), []

    def get(self, url: str, timeout=None, stream=False):
        self.urls.append(url)
        r = self.queue.pop(0) if self.queue else self.route(url)
        if isinstance(r, Exception):
            raise r
        return r


class FakeClock:
    def __init__(self) -> None:
        self.t, self.slept = 0.0, []

    def __call__(self) -> float:
        return self.t

    def sleep(self, s: float) -> None:
        self.slept.append(s)
        self.t += s


FIRMS_HEADER = (b"latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,"
                b"confidence,version,bright_ti5,frp,daynight,type\n")
