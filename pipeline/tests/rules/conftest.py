"""Shared test setup for the rule engine: Hypothesis profiles (task 6.1) and research fixtures (task 7.1)."""

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path

import pytest
from hypothesis import settings

from pipeline.rules.types import GraveInput, Hotspot

# dev: quick local runs (200 examples). ci: thorough runs (1000). Pick with HYPOTHESIS_PROFILE.
# deadline=None: example timing varies on Windows and is not part of the spec.
settings.register_profile("dev", max_examples=200, deadline=None)
settings.register_profile("ci", max_examples=1000, deadline=None)
settings.load_profile(os.environ.get("HYPOTHESIS_PROFILE", "dev"))


# --- Research fixtures from data/seasons.json (Requirement 6) ----------------------------------
# Read-only: the file is opened for reading only and its hash is checked after the run.

RESEARCH_PATH = Path(__file__).resolve().parents[3] / "data" / "seasons.json"

# Chance baselines from docs/method.md ("Rule as implemented"). data/seasons.json has no chance field.
RESEARCH_CHANCE = {"s2024": 0.347, "s2025": 0.365, "s2026": 0.201}


@dataclass(frozen=True)
class ResearchSeason:
    key: str
    graves: tuple[GraveInput, ...]
    stored_melt: dict[str, int]  # grave id -> stored melt day
    stored_rise: dict[str, tuple[int, float, float] | None]
    chance: float
    season_length: int


def _load_season(raw: dict, key: str) -> ResearchSeason:
    graves, melts, rises = [], {}, {}
    lengths = set()
    for i, row in enumerate(raw[key]["g"]):
        size, cx, cy, melt, rise, _early_hits, series = row
        gid = f"G-{i + 1:02d}"
        snow = tuple(None if v == -1 else v / 100 for v in map(int, series.split(",")))
        lengths.add(len(snow))
        # The stored rise point is the only hotspot. early_hits is a count with no dates, so no
        # hotspots are invented for it (honesty.md).
        hotspots = (Hotspot(day=rise[0], x=rise[1], y=rise[2], on_scar=True),) if rise else ()
        graves.append(GraveInput(id=gid, size=size, cx=cx, cy=cy, snow=snow, hotspots=hotspots))
        melts[gid] = melt
        rises[gid] = tuple(rise) if rise else None
    assert len(lengths) == 1, f"{key}: snow series lengths differ: {lengths}"
    return ResearchSeason(key, tuple(graves), melts, rises, RESEARCH_CHANCE[key], lengths.pop())


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.fixture(scope="session")
def research_hash_before() -> str:
    return _sha256(RESEARCH_PATH)


@pytest.fixture(scope="session")
def research(research_hash_before) -> dict[str, ResearchSeason]:
    with RESEARCH_PATH.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    return {key: _load_season(raw, key) for key in RESEARCH_CHANCE}


def research_sha256() -> str:
    return _sha256(RESEARCH_PATH)
