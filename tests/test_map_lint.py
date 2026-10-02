"""
test_map_lint.py — map_lint.py's reading of the map: full paths at column
0, bare names under a folder heading, first words only — and a name
mapped under one folder doesn't map its namesake in another.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from map_lint import check, mapped  # noqa: E402

MAP = """
```txt
scripts/build.py     the pipeline; see layouts/stray.html
layouts/_partials/
  head.html          title; uses row.html
                     continued description, node.html
layouts/_partials/tree/   a folder of its own
  row.html           a row
```
Prose naming layouts/home.html maps it; a bare node.html doesn't.
"""


class MapLintTest(unittest.TestCase):
    def test_mapped(self):
        self.assertEqual(mapped(MAP), {
            "scripts/build.py", "layouts/_partials/head.html", "layouts/_partials/tree/row.html"})

    def test_namesake_in_another_folder_is_unmapped(self):
        sources = {"scripts/build.py", "layouts/_partials/head.html", "layouts/_partials/tree/row.html",
                   "layouts/home.html", "layouts/_partials/row.html", "layouts/_partials/tree/node.html"}
        self.assertEqual(check(MAP, sources, lambda rel: True),
                         ["UNMAPPED layouts/_partials/row.html", "UNMAPPED layouts/_partials/tree/node.html"])

    def test_gone(self):
        sources = {"scripts/build.py", "layouts/_partials/head.html"}
        self.assertEqual(check(MAP, sources, lambda rel: rel in sources),
                         ["GONE     layouts/_partials/tree/row.html"])


if __name__ == "__main__":
    unittest.main()
