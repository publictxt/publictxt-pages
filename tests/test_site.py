"""
test_site.py — the golden test's content through Hugo; the page index
(index.json, what every browse list renders) compared with
tests/golden/index.json — and rendered HTML where a template, not the
index, is the case (dataview lists). Skipped without `hugo` on PATH.

Builds in build/test/ (gitignored), mounting it in place of build/content, in
the development environment so index.json isn't fingerprinted. Refresh with
test_golden.py, after it (its refresh drops index.json):

  GOLDEN_UPDATE=1 python -m unittest tests.test_golden tests.test_site
"""

import json
import os
import re
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
        hugo = subprocess.run(
            [HUGO, "--environment", "development", "--config", ",".join(configs),
             "--destination", "build/test/public"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if hugo.returncode:
            raise RuntimeError("hugo failed:\n" + hugo.stdout + hugo.stderr)
        cls.public = WORK / "public"
        cls.index = canonical(json.loads((cls.public / "index.json").read_text(encoding="utf-8")))
        if os.environ.get("GOLDEN_UPDATE"):
            INDEX.write_text(cls.index, encoding="utf-8", newline="\n")

    def test_same_index(self):
        self.assertTrue(INDEX.is_file(), "no snapshot yet — run with GOLDEN_UPDATE=1")
        self.assertEqual(INDEX.read_text(encoding="utf-8").replace("\r\n", "\n"), self.index)

    def test_note_embed(self):
        """notes/embeds.md: a standalone `![](…/Cosmology.md)` embeds; inline, a link; videos and audio keep their <p>."""
        html = (self.public / "notes" / "embeds" / "index.html").read_text(encoding="utf-8")
        self.assertIn('<div class="embed" data-pagefind-ignore="all">', html)
        self.assertIn('<a class="embed-title" href="/wiki/science/cosmology/">Cosmology</a>', html)
        self.assertIn("issue #42", html)
        self.assertIn('Inline, <a href="/notes/sample/">sample</a> is just a link.', html)
        self.assertIn('<p><iframe class="video"', html)
        self.assertIn('<p><audio class="audio" controls preload="metadata" src="/media/silence.wav" aria-label="Half a second of silence"></audio></p>', html)
        self.assertIn('<img src="/notes/dot.png" alt="A dot">', html)

    def test_image_beside_post(self):
        """A pasted image beside a post, Obsidian's `%20` name: its section's file."""
        html = (self.public / "blog" / "2026" / "20260925-another-issue-with-the-fermi-paradox---the-barrow-scale"
                / "index.html").read_text(encoding="utf-8")
        self.assertIn('<img src="/blog/2026/Pasted%20image%2020260925101500.png" alt="Barrow Scale sketch">', html)
        self.assertTrue((self.public / "blog" / "2026" / "Pasted image 20260925101500.png").is_file())

    def test_spaced_note_link(self):
        """blog/_index.md: a link to a note with spaces in its name, `<…>` or `%20`, reaches it."""
        html = (self.public / "blog" / "index.html").read_text(encoding="utf-8")
        page = "/blog/2026/20260922-technopolitics/"
        self.assertIn(f'<a href="{page}">TechnoPolitics</a>, or <a href="{page}">escaped</a>', html)

    def test_dataview_tag_list(self):
        """notes/tag-lists.md: `LIST FROM #sci` + `LIMIT 2` of 5; a TABLE query stays code."""
        html = (self.public / "notes" / "tag-lists" / "index.html").read_text(encoding="utf-8")
        # From the list to the second block.
        block = re.search(r'<div class="dataview" data-pagefind-ignore="all">(.*?)TABLE rating', html, re.S)
        self.assertIsNotNone(block, "no dataview list")
        self.assertIn('data-scope-kind="tag" data-scope-value="sci"', block[1])
        self.assertIn('data-limit="2"', block[1])
        self.assertEqual(block[1].count("<li>"), 2)
        self.assertIn("All 5 pages tagged #sci", block[1])
        self.assertRegex(html, r"<pre[^>]*>.*TABLE rating FROM #sci", "unsupported query not left as code")


if __name__ == "__main__":
    unittest.main()
