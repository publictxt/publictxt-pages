"""
test_site.py — the golden test's content through Hugo; the page index
(index.json, what every browse list renders) compared with
tests/golden/index.json. Skipped without `hugo` on PATH.

Builds in build/test/ (gitignored), mounting it in place of build/content, in
the development environment so index.json isn't fingerprinted. Refresh as
test_golden.py:

  GOLDEN_UPDATE=1 python -m unittest tests.test_site
"""

import json
import os
import shutil
import subprocess
import unittest

from .test_golden import GOLDEN, ROOT, build

HUGO = shutil.which("hugo")
WORK = ROOT / "build" / "test"
INDEX = GOLDEN / "index.json"
# Lists replace whole in a config overlay: this swaps build/content for WORK.
MOUNTS = """[module]
  [[module.mounts]]
    source = "build/test/content"
    target = "content"
  [[module.mounts]]
    source = "site-content"
    target = "content"
"""


def canonical(data) -> str:
    return json.dumps(data, indent=1, sort_keys=True, ensure_ascii=False) + "\n"


@unittest.skipUnless(HUGO, "hugo not on PATH")
class SiteIndexTest(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls):
        shutil.rmtree(WORK, ignore_errors=True)
        build(WORK)
        (WORK / "mounts.toml").write_text(MOUNTS, encoding="utf-8")
        configs = ["hugo.toml", "build/test/site.toml", "build/test/mounts.toml"]
        subprocess.run(
            [HUGO, "--quiet", "--environment", "development", "--config", ",".join(configs),
             "--destination", "build/test/public"],
            cwd=ROOT, check=True)
        cls.index = canonical(json.loads((WORK / "public" / "index.json").read_text(encoding="utf-8")))
        if os.environ.get("GOLDEN_UPDATE"):
            INDEX.write_text(cls.index, encoding="utf-8", newline="\n")

    def test_same_index(self):
        self.assertTrue(INDEX.is_file(), "no snapshot yet — run with GOLDEN_UPDATE=1")
        self.assertEqual(INDEX.read_text(encoding="utf-8").replace("\r\n", "\n"), self.index)


if __name__ == "__main__":
    unittest.main()
