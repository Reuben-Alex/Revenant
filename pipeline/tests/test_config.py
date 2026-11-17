"""FIRMS key loading (Requirement 1.8) and config sanity."""

from pathlib import Path

import pytest

from pipeline import config
from pipeline.config import KeyMissing, firms_key

FAKE = "0123456789abcdef0123456789abcdef"  # not a real key


def test_environment_wins_over_dotenv(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("FIRMS_MAP_KEY=from-dotenv\n", encoding="utf-8")
    assert firms_key({"FIRMS_MAP_KEY": FAKE}, env_file) == FAKE


def test_dotenv_used_when_env_missing_or_blank(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(f"# comment\nOTHER=1\n FIRMS_MAP_KEY = \"{FAKE}\" \n", encoding="utf-8")
    assert firms_key({}, env_file) == FAKE
    assert firms_key({"FIRMS_MAP_KEY": "  "}, env_file) == FAKE


@pytest.mark.parametrize("content", [None, "", "OTHER=1\n", "FIRMS_MAP_KEY=\n", "# FIRMS_MAP_KEY=x\n"])
def test_missing_key_names_both_places(tmp_path: Path, content) -> None:
    env_file = tmp_path / ".env"
    if content is not None:
        env_file.write_text(content, encoding="utf-8")
    with pytest.raises(KeyMissing) as err:
        firms_key({}, env_file)
    msg = str(err.value)
    assert "environment variable" in msg and ".env" in msg


def test_config_does_not_read_key_at_import() -> None:
    assert not any(isinstance(v, str) and len(v) == 32 and v.isalnum() and not v.isupper()
                   for k, v in vars(config).items() if not k.startswith("_"))


def test_cache_dir_is_gitignored() -> None:
    ignore = (config.REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    assert "pipeline/cache/" in ignore
    assert config.CACHE_DIR == config.REPO_ROOT / "pipeline" / "cache"
