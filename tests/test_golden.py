"""
test_golden.py — sync over example/txt, compared with the committed
snapshot in tests/golden/. Any difference fails; the diff says what moved.

Dates are fixed: every file reads as first committed at CREATED and last at
UPDATED, so the snapshot doesn't shift with this repo's history. The ladder
itself is test_dates.py's.

An intended change: refresh, then read the diff before committing —
reviewing it is the test.

  GOLDEN_UPDATE=1 python -m unittest tests.test_golden     (PowerShell: $env:GOLDEN_UPDATE=1)
"""

import contextlib
import io
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from dates import DateResolver          # noqa: E402
from sync_content import sync           # noqa: E402

EXAMPLE = ROOT / "example" / "txt"
GOLDEN = ROOT / "tests" / "golden"
FILES = GOLDEN / "files.txt"            # every output path, binaries too
TEXT = {".md", ".toml"}                 # snapshotted by content; the rest by path
CREATED = "2025-01-01T12:00:00+00:00"
UPDATED = "2025-03-01T12:00:00+00:00"   # >1 day on: exercises "updated" display


class FixedDates(DateResolver):
    """The real ladder, over a fake Git history where every file has one fixed span."""

    def __init__(self, src: Path):
        self.src = src
        self.shallow_clone = False
        self.built_at = UPDATED
        self.git_times = {p.relative_to(src).as_posix(): (CREATED, UPDATED)
                          for p in src.rglob("*") if p.is_file()}


def build(out: Path) -> None:
    """build/ as the pipeline makes it: out/content + out/site.toml."""
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        sync(EXAMPLE, out / "content", FixedDates(EXAMPLE))


def outputs(root: Path) -> list[str]:
    return sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())


def read(path: Path) -> str:
    # Sync writes the platform's newlines; the snapshot is LF.
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def update(out: Path) -> None:
    shutil.rmtree(GOLDEN, ignore_errors=True)
    GOLDEN.mkdir(parents=True)
    paths = outputs(out)
    FILES.write_text("\n".join(paths) + "\n", encoding="utf-8", newline="\n")
    for rel in paths:
        if Path(rel).suffix in TEXT:
            target = GOLDEN / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(read(out / rel), encoding="utf-8", newline="\n")


class GoldenTest(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name)
        build(cls.out)
        if os.environ.get("GOLDEN_UPDATE"):
            update(cls.out)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_same_files(self):
        self.assertTrue(FILES.is_file(), "no snapshot yet — run with GOLDEN_UPDATE=1")
        self.assertEqual(read(FILES), "\n".join(outputs(self.out)) + "\n")

    def test_same_content(self):
        for rel in outputs(self.out):
            if Path(rel).suffix not in TEXT or not (GOLDEN / rel).is_file():
                continue   # a missing file is test_same_files' failure
            with self.subTest(rel):
                self.assertEqual(read(GOLDEN / rel), read(self.out / rel))


if __name__ == "__main__":
    unittest.main()
