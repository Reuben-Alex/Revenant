"""The rule engine does no I/O (task 8.1; Requirement 1.9): AST scan of pipeline/rules/*.py imports."""

import ast
from pathlib import Path

import pytest

RULES = Path(__file__).resolve().parents[2] / "rules"
FORBIDDEN = {"os", "io", "pathlib", "json", "socket", "requests", "urllib", "time", "datetime", "random"}
FILES = sorted(RULES.glob("*.py"))


def imported_modules(path: Path) -> set[str]:
    """Top-level names of every absolute import in the file (relative imports stay inside the package)."""
    names: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"), filename=str(path))):
        if isinstance(node, ast.Import):
            names.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            names.add(node.module.split(".")[0])
        elif isinstance(node, ast.Call) and getattr(node.func, "id", None) in {"__import__", "open", "eval", "exec"}:
            names.add(f"<call {node.func.id}>")
    return names


def test_rule_files_found() -> None:
    assert {p.name for p in FILES} >= {"constants.py", "melt.py", "risen.py", "season.py", "states.py", "types.py", "validate.py"}


@pytest.mark.parametrize("path", FILES, ids=lambda p: p.name)
def test_no_io_imports(path: Path) -> None:
    bad = {m for m in imported_modules(path) if m in FORBIDDEN or m.startswith("<call")}
    assert not bad, f"{path.name} imports or calls {sorted(bad)}"


def test_scanner_catches_forbidden_imports(tmp_path: Path) -> None:
    sample = tmp_path / "sample.py"
    sample.write_text("import os.path\nfrom json import loads\nfrom . import melt\nx = open('f')\n", encoding="utf-8")
    assert imported_modules(sample) == {"os", "json", "<call open>"}
