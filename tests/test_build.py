"""
test_build.py — build.py's search index check, over small made-up public/ trees.
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from build import check_search_index  # noqa: E402

KEYS = ('<span hidden data-pagefind-sort="created[data-created], title[data-title]" '
        'data-pagefind-filter="year[data-year], rating[data-rating]"></span>')


class SearchIndexCheck(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.public = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def page(self, path: str, html: str) -> None:
        f = self.public / path
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(f"<html><body>{html}</body></html>", encoding="utf-8")

    def indexed(self, n: int) -> None:
        self.page("pagefind/ignored.html", "<div data-pagefind-body></div>")
        (self.public / "pagefind" / "pagefind-entry.json").write_text(
            json.dumps({"version": "x", "languages": {"en": {"page_count": n}}}), encoding="utf-8")

    def test_consistent_site_passes(self):
        self.page("a/index.html", f"{KEYS}<article data-pagefind-body>a</article>")
        self.page("b/index.html", f"<article data-pagefind-body>{KEYS}b</article>")
        self.page("search/index.html", "<div id=search></div>")   # no body: not indexed
        self.indexed(2)
        self.assertEqual(check_search_index(self.public), [])

    def test_count_mismatch(self):
        self.page("a/index.html", f"{KEYS}<article data-pagefind-body>a</article>")
        self.indexed(3)
        self.assertIn("Pagefind indexed 3 page(s); 1 have data-pagefind-body", check_search_index(self.public))

    def test_body_without_keys(self):
        self.page("a/index.html", f"{KEYS}<article data-pagefind-body>a</article>")
        self.page("b/index.html", "<article data-pagefind-body>b</article>")
        self.indexed(2)
        [problem] = check_search_index(self.public)
        self.assertTrue(problem.startswith("b/index.html: no pagefind-keys.html span"))

    def test_missing_key(self):
        self.page("a/index.html", f"{KEYS}<article data-pagefind-body>a</article>")
        self.page("b/index.html", '<span data-pagefind-sort="created[x], title[y]" '
                                  'data-pagefind-filter="year[z]"></span><article data-pagefind-body></article>')
        self.indexed(2)
        [problem] = check_search_index(self.public)
        self.assertTrue(problem.startswith("b/index.html: lacks rating"), problem)


if __name__ == "__main__":
    unittest.main()
