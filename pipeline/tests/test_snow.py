"""Snow per scar with the cloud mask (Requirements 5.2–5.5), including Property 6."""

import io

import numpy as np
from hypothesis import given
from hypothesis import strategies as st
from hypothesis.extra.numpy import arrays
from PIL import Image

from pipeline.snow import fraction, opaque, percent_string, region_missing, series, table, to_percent

H, W = 6, 8  # small frames for most tests; min_px is passed explicitly


def png(alpha: np.ndarray) -> bytes:
    rgba = np.zeros(alpha.shape + (4,), dtype=np.uint8)
    rgba[..., :3] = 240
    rgba[..., 3] = alpha.astype(np.uint8) * 255
    buf = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buf, "PNG")
    return buf.getvalue()


def frame(*cells: tuple[int, int]) -> np.ndarray:
    f = np.zeros((H, W), dtype=bool)
    for r, c in cells:
        f[r, c] = True
    return f


SCAR = frame((1, 1), (1, 2), (2, 1), (2, 2))  # 4 pixels
NONE = frame()


# --- decoding ----------------------------------------------------------------------------------

def test_opaque_reads_alpha() -> None:
    a = frame((0, 0), (5, 7))
    assert np.array_equal(opaque(png(a), (H, W)), a)


def test_opaque_rejects_missing_corrupt_and_wrong_size() -> None:
    assert opaque(None, (H, W)) is None
    assert opaque(b"\x89PNG\r\n\x1a\nnot really", (H, W)) is None
    assert opaque(png(np.zeros((H, W + 1), dtype=bool)), (H, W)) is None


# --- fraction rules ----------------------------------------------------------------------------

def test_snow_clear_cloud() -> None:
    snow = frame((1, 1))
    cloud = frame((1, 2))  # one of four is cloud
    assert fraction(SCAR, snow, cloud, min_px=0) == 1 / 3  # snow / (snow + clear)
    assert fraction(SCAR, snow, cloud, use_cloud_mask=False, min_px=0) == 1 / 4  # research method


def test_snow_wins_over_cloud() -> None:
    both = frame((1, 1), (1, 2))
    assert fraction(SCAR, both, both, min_px=0) == 2 / 4


def test_more_than_half_cloud_is_missing() -> None:
    assert fraction(SCAR, NONE, frame((1, 1), (1, 2)), min_px=0) == 0.0  # exactly 50 %: kept
    assert fraction(SCAR, NONE, frame((1, 1), (1, 2), (2, 1)), min_px=0) is None  # 75 %


def test_region_rule_and_failed_frames() -> None:
    snow = frame((0, 0), (0, 1))
    assert fraction(SCAR, snow, NONE, min_px=3) is None  # < min_px opaque snow region-wide
    assert fraction(SCAR, snow, NONE, min_px=2) == 0.0
    assert fraction(SCAR, None, NONE, min_px=0) is None  # snow frame failed
    assert fraction(SCAR, snow, None, min_px=0) is None  # cloud frame failed
    assert fraction(SCAR, snow, None, use_cloud_mask=False, min_px=0) == 0.0  # research method ignores cloud
    assert region_missing(snow, NONE, min_px=2000)  # the real threshold on a tiny frame


def test_empty_scar_is_missing() -> None:
    assert fraction(NONE, frame((1, 1)), NONE, min_px=0) is None


def test_series_and_table_agree() -> None:
    days = [(frame((1, 1)), NONE), (None, NONE), (NONE, frame((1, 1), (2, 2), (1, 2))), (SCAR, SCAR)]
    other = frame((4, 4), (4, 5))
    for use in (True, False):
        expected = [series(m, days, use, min_px=0) for m in (SCAR, other, NONE)]
        assert table([SCAR, other, NONE], days, use, min_px=0) == expected
    assert series(SCAR, days, min_px=0) == (0.25, None, None, 1.0)


def test_percent_string() -> None:
    assert [to_percent(v) for v in (None, 0.0, 0.004999, 0.005, 0.145, 29 / 200, 0.1449, 1.0)] == [
        -1, 0, 0, 1, 15, 15, 14, 100]
    assert percent_string([0.87, None, 0.26]) == "87,-1,26"


def test_full_size_frames() -> None:
    from pipeline.config import GRID_H, GRID_W

    snow = np.zeros((GRID_H, GRID_W), dtype=bool)
    snow[:3, :] = True  # 3180 opaque px region-wide, above 2000
    mask = np.zeros_like(snow)
    mask[1:5, 10:20] = True  # 40 px, 20 under snow
    cloud = np.zeros_like(snow)
    assert fraction(mask, snow, cloud) == 0.5
    assert opaque(png(snow)).sum() == 3180


# --- Property 6 --------------------------------------------------------------------------------

grids = arrays(bool, (H, W))


@given(grids, grids, grids, st.booleans())
def test_property_6_fraction_of_known_pixels(mask, snow, cloud, use_cloud) -> None:
    """Property 6. Validates: Requirements 5.2, 5.3, 5.4."""
    f = fraction(mask, snow, cloud, use_cloud, min_px=0)
    n = int(mask.sum())
    if f is not None:
        assert 0.0 <= f <= 1.0
    if n:
        # all clear -> 0; all snow -> 1
        assert fraction(mask, np.zeros_like(mask), np.zeros_like(mask), use_cloud, min_px=0) == 0.0
        assert fraction(mask, mask | snow, cloud, use_cloud, min_px=0) == 1.0
        # cloud added only on snow pixels changes nothing
        assert fraction(mask, snow, cloud | snow, use_cloud, min_px=0) == f
        # more than half cloud -> missing (with the mask on)
        c = int((mask & cloud & ~snow).sum())
        if use_cloud:
            assert (f is None) == (c > 0.5 * n)
        # clearing any cloudy pixel never makes a known day missing
        if f is not None:
            for r, col in zip(*np.nonzero(cloud)):
                cleared = cloud.copy()
                cleared[r, col] = False
                assert fraction(mask, snow, cleared, use_cloud, min_px=0) is not None
    # snow frame below the region threshold -> missing
    assert fraction(mask, snow, cloud, use_cloud, min_px=int(snow.sum()) + 1) is None
