"""Hypothesis strategies for the rule engine (task 6.1; design.md "Correctness Properties").

Season lengths 1–120. Snow values mix None, the 0.15 boundary (0.149, 0.15, 0.151) and the full [0, 1]
range. Fully random series rarely melt, so half the series are structured like a real spring:
snowy days, then mostly snow-free days with gaps and the odd late snowfall.
"""

from hypothesis import strategies as st

from pipeline.rules.types import GraveInput, Hotspot

MAX_SEASON = 120
BOUNDARY = (0.149, 0.15, 0.151)

season_lengths = st.integers(min_value=1, max_value=MAX_SEASON)

snow_values = st.one_of(
    st.none(),
    st.sampled_from(BOUNDARY),
    st.floats(min_value=0.0, max_value=1.0),
    st.floats(min_value=0.0, max_value=0.149),
)
snowy_values = st.one_of(st.none(), st.sampled_from((0.15, 0.151)), st.floats(min_value=0.15, max_value=1.0))
spring_values = st.one_of(
    st.floats(min_value=0.0, max_value=0.149),
    st.sampled_from(BOUNDARY),
    st.none(),
)


@st.composite
def snow_series(draw, n: int) -> tuple[float | None, ...]:
    if draw(st.booleans()):
        return tuple(draw(st.lists(snow_values, min_size=n, max_size=n)))
    k = draw(st.integers(min_value=0, max_value=n))
    head = draw(st.lists(snowy_values, min_size=k, max_size=k))
    tail = draw(st.lists(spring_values, min_size=n - k, max_size=n - k))
    return tuple(head + tail)


def hotspots_for(n: int, on_scar: st.SearchStrategy[bool] = st.booleans()) -> st.SearchStrategy[Hotspot]:
    return st.builds(
        Hotspot,
        day=st.integers(min_value=0, max_value=n - 1),
        x=st.floats(min_value=0.0, max_value=1060.0),
        y=st.floats(min_value=0.0, max_value=716.0),
        on_scar=on_scar,
    )


@st.composite
def graves(draw, n: int, id: str = "G-01") -> GraveInput:
    return GraveInput(
        id=id,
        size=draw(st.integers(min_value=1, max_value=20000)),
        cx=draw(st.floats(min_value=0.0, max_value=1060.0)),
        cy=draw(st.floats(min_value=0.0, max_value=716.0)),
        snow=draw(snow_series(n)),
        hotspots=tuple(draw(st.lists(hotspots_for(n), max_size=8))),
    )


@st.composite
def grave_and_length(draw) -> tuple[GraveInput, int]:
    n = draw(season_lengths)
    return draw(graves(n)), n


@st.composite
def seasons(draw) -> tuple[list[GraveInput], float, int]:
    """(graves with unique G- ids, chance in [0, 1], season length)."""
    n = draw(season_lengths)
    count = draw(st.integers(min_value=1, max_value=6))
    gs = [draw(graves(n, id=f"G-{i + 1:02d}")) for i in range(count)]
    chance = draw(st.floats(min_value=0.0, max_value=1.0))
    return gs, chance, n
