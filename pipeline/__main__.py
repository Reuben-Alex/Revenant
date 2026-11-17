"""Pipeline command line (spec 02).

    uv run python -m pipeline seasons [--today YYYY-MM-DD]
    uv run python -m pipeline tonight [--today YYYY-MM-DD]

Exit 0 on success, 1 on any failure (nothing is published on failure). The clock is read only here.
"""

import argparse
import json
import sys
from datetime import UTC, date, datetime

from .build import BuildError, Sources, build_season, build_tonight, seasons_document
from .keyframe import to_webp
from .chance import ChanceUndefined
from .config import REPLAY_YEARS, KeyMissing, firms_key
from .firms import Firms, FirmsError
from .gibs import Gibs
from .http import Client, HttpError
from .nbac import Nbac, NbacError
from .publish import PUBLIC_DATA, PUBLIC_IMG, PublishError, mask_png, publish_bytes, publish_json
from .scars import union_mask

FAILURES = (KeyMissing, FirmsError, HttpError, NbacError, BuildError, ChanceUndefined, PublishError, ValueError)


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def utc_now() -> datetime:
    return datetime.now(UTC)


def sources(today: date) -> tuple[Sources, Client]:
    key = firms_key()
    client = Client(secrets=(key,))
    return Sources(Firms(client, key, today=today), Gibs(client, today=today), Nbac(client)), client


def cmd_seasons(today: date) -> int:
    src, client = sources(today)
    used, limit = src.firms.budget()
    log(f"FIRMS key status: {used} of {limit} transactions used in the current window")
    builds = [build_season(src, y, log=log) for y in REPLAY_YEARS]
    doc = seasons_document(builds, utc_now().isoformat(timespec="seconds").replace("+00:00", "Z"))
    publish_json(doc, PUBLIC_DATA / "seasons.json", "seasons")
    for b in builds:
        publish_bytes(mask_png(union_mask(b.all_scars)), PUBLIC_IMG / f"scars-{b.year - 1}.png")
    used, limit = src.firms.budget()
    log(f"requests made: {client.requests_made}; FIRMS pages fetched: {src.firms.fetched}; "
        f"key status now {used} of {limit}")
    for b in builds:
        r = b.result
        print(f"Spring {b.year}: risen {r.risen_count}/{len(r.graves)}, chance {b.block['chance']:.3f} "
              f"({b.chance.hits}/{b.chance.accepted} offsets), zombie year: {r.zombie_year}; "
              f"points {b.n_raw_points} raw -> {b.n_clean_points} clean, dropped {dict(b.drop_counts)}; "
              f"{len(b.all_scars)} scars, {len(b.fires)} new fires, {b.frames_missing} missing frame-days")
    print(f"static cells (SP type 2/3, three springs): {doc['static']}")
    return 0


def previous_frame_date() -> str | None:
    """frame_date of the currently published tonight.json, if it and its frame exist (Requirement 9.4)."""
    path = PUBLIC_DATA / "tonight.json"
    if not path.exists() or not (PUBLIC_IMG / "viirs-latest.webp").exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8")).get("frame_date")
    except (ValueError, OSError):
        return None


def cmd_tonight(today: date) -> int:
    src, client = sources(today)
    used, limit = src.firms.budget()
    log(f"FIRMS key status: {used} of {limit} transactions used in the current window")
    as_of = utc_now().isoformat(timespec="seconds").replace("+00:00", "Z")
    t = build_tonight(src, today, as_of, previous_frame_date(), log=log)
    webp = to_webp(t.frame_jpeg) if t.frame_jpeg is not None else None  # encode before publishing anything
    publish_json(t.doc, PUBLIC_DATA / "tonight.json", "tonight")
    if webp is not None:
        publish_bytes(webp, PUBLIC_IMG / "viirs-latest.webp")
    publish_bytes(mask_png(union_mask(t.all_scars)), PUBLIC_IMG / f"scars-{today.year}.png")
    used, limit = src.firms.budget()
    log(f"requests made: {client.requests_made}; FIRMS pages fetched: {src.firms.fetched}; "
        f"key status now {used} of {limit}")
    g = t.doc["g"]
    warm = sum(1 for row in g if row[4] > 0)
    print(f"Tonight {today}: {len(g)} scars, {warm} with heat in the last 14 days, {len(t.doc['r'])} last-7-day clusters; "
          f"frame {t.doc['frame_date']} ({'new' if webp else 'kept'}); points through {t.doc['points_through']}; "
          f"points {t.n_raw_points} raw -> {t.n_clean_points} clean, dropped {dict(t.drop_counts)}; "
          f"{t.doc['static']} recurring cells")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m pipeline")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name, text in (("seasons", "build public/data/seasons.json and the scar masks"),
                       ("tonight", "build public/data/tonight.json, the latest frame and this year's scar mask")):
        s = sub.add_parser(name, help=text)
        s.add_argument("--today", type=date.fromisoformat, default=None, help="UTC date (default: now)")
    args = p.parse_args(argv)
    today = args.today or utc_now().date()
    try:
        if args.cmd == "seasons":
            return cmd_seasons(today)
        if args.cmd == "tonight":
            return cmd_tonight(today)
    except FAILURES as e:
        log(f"error: {e}")
        return 1
    return 2


if __name__ == "__main__":
    sys.exit(main())
