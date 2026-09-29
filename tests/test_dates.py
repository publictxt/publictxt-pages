"""
test_dates.py — the date ladder (dates.py). The golden test fixes Git dates,
so the rungs and their order are checked here.
"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from dates import UNDATED, DateResolver, date_from_path, sort_key  # noqa: E402


class DateFromPath(unittest.TestCase):
    def test_name_and_path_forms(self):
        cases = {
            "blog/20241013-title.md": "2024-10-13",
            "blog/2024-10-13-title.md": "2024-10-13",
            "notes/The Mess . 20240816.md": "2024-08-16",
            "blog/2023/12/17/post.md": "2023-12-17",
            "blog/2023/12/17/20231218.md": "2023-12-18",   # the name beats the path
        }
        for rel, want in cases.items():
            with self.subTest(rel):
                self.assertEqual(date_from_path(rel), want)

    def test_not_dates(self):
        for rel in ("notes/isbn 9780140449136.md",   # longer digit run
                    "notes/2023-Week50.md",
                    "notes/Room 20240000.md",          # month 00
                    "blog/2023/12/post.md",            # path needs the day
                    "notes/plain.md"):
            with self.subTest(rel):
                self.assertIsNone(date_from_path(rel))


class Ladder(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.src = Path(self._tmp.name)
        self.file = self.src / "notes" / "a.md"
        self.file.parent.mkdir()
        self.file.write_text("x")
        self.r = DateResolver(self.src)   # not a Git repo: no history
        self.r.git_times = {}

    def tearDown(self):
        self._tmp.cleanup()

    def test_path_beats_git(self):
        self.r.git_times = {"blog/20240101-a.md": ("2025-01-01T00:00:00+00:00",) * 2}
        self.assertEqual(self.r.created(self.file, "blog/20240101-a.md"), ("2024-01-01", "path"))

    def test_git_then_mtime(self):
        self.r.git_times = {"notes/a.md": ("2025-01-01T00:00:00+00:00", "2025-02-01T00:00:00+00:00")}
        self.assertEqual(self.r.created(self.file, "notes/a.md"), ("2025-01-01T00:00:00+00:00", "git"))
        self.assertEqual(self.r.updated(self.file, "notes/a.md"), "2025-02-01T00:00:00+00:00")
        self.r.git_times = {}
        self.assertEqual(self.r.created(self.file, "notes/a.md")[1], "mtime")

    def test_build_when_file_missing(self):
        gone = self.src / "gone.md"
        self.assertEqual(self.r.created(gone, "gone.md"), (self.r.built_at, "build"))
        self.assertEqual(self.r.updated(gone, "gone.md"), self.r.built_at)


class SortKey(unittest.TestCase):
    def test_orders_mixed_forms(self):
        self.assertLess(sort_key("2024-01-01"), sort_key("2024-01-02T00:00:00+00:00"))
        self.assertEqual(sort_key("not a date"), UNDATED)


if __name__ == "__main__":
    unittest.main()
