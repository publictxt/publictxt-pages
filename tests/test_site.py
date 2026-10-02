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
        """notes/embeds.md: a standalone `![](…/Search.md)` embeds; inline, a link; videos and audio keep their <p>."""
        html = (self.public / "notes" / "embeds" / "index.html").read_text(encoding="utf-8")
        self.assertIn('<div class="embed" data-pagefind-ignore="all">', html)
        self.assertIn('<a class="embed-title" href="/wiki/site/search/">Search</a>', html)
        self.assertIn("issue #42", html)
        self.assertIn('Inline, <a href="/notes/sample/">sample</a> is just a link.', html)
        self.assertIn('<p><iframe class="video"', html)
        self.assertIn('<p><audio class="audio" controls preload="metadata" src="/media/silence.wav" aria-label="A moment of silence"></audio></p>', html)
        self.assertIn('<img src="/notes/pipeline.png" alt="The build: sync, Hugo, Pagefind">', html)

    def test_image_beside_post(self):
        """A pasted image beside a post, Obsidian's `%20` name: its section's file."""
        html = (self.public / "blog" / "2026" / "20260925-attachments-beside-the-note---no-post-folders"
                / "index.html").read_text(encoding="utf-8")
        self.assertIn('<img src="/blog/2026/Pasted%20image%2020260925101500.png" alt="A pasted image">', html)
        self.assertTrue((self.public / "blog" / "2026" / "Pasted image 20260925101500.png").is_file())

    def test_spaced_note_link(self):
        """blog/_index.md: a link to a note with spaces in its name, `<…>` or `%20`, reaches it."""
        html = (self.public / "blog" / "index.html").read_text(encoding="utf-8")
        page = "/blog/2026/20260925-attachments-beside-the-note---no-post-folders/"
        self.assertIn(f'<a href="{page}">attachments</a>, or <a href="{page}">escaped</a>', html)

    def test_dataview_tag_list(self):
        """notes/tag-lists.md: `LIST FROM #site` + `LIMIT 2` of 6; a TABLE query stays code."""
        html = (self.public / "notes" / "tag-lists" / "index.html").read_text(encoding="utf-8")
        # From the list to the second block.
        block = re.search(r'<div class="dataview" data-pagefind-ignore="all">(.*?)TABLE rating', html, re.S)
        self.assertIsNotNone(block, "no dataview list")
        self.assertIn('data-scope-kind="tag" data-scope-value="site"', block[1])
        self.assertIn('data-limit="2"', block[1])
        self.assertEqual(block[1].count("<li>"), 2)
        self.assertIn("All 6 pages tagged #site", block[1])
        self.assertRegex(html, r"<pre[^>]*>.*TABLE rating FROM #site", "unsupported query not left as code")

    def test_wiki_tree(self):
        """A wiki page: the folder tree, not the timeline — open along its path, the page marked."""
        html = (self.public / "wiki" / "site" / "lists" / "browse-lists" / "index.html").read_text(encoding="utf-8")
        tree = re.search(r'<details class="timeline fold tree".*?</nav>', html, re.S)
        self.assertIsNotNone(tree, "no folder tree")
        self.assertNotIn("data-page-timeline", html)
        tree = tree[0]
        self.assertEqual(re.findall(r'<li class="tree-dir on-path"><details open><summary class="tree-row">'
                                    r'<span class="tree-node" aria-hidden="true"></span><a class="tree-pick" href="([^"]+)"', tree),
                         ["/wiki/site/", "/wiki/site/lists/"])
        self.assertEqual(tree.count("<details open>"), 2, "only the path open")
        self.assertIn('<li class="tree-page current"><a href="/wiki/site/lists/browse-lists/" aria-current="page">', tree)
        # Shut folders keep their pages, and counts.
        self.assertIn('<a href="/wiki/pipeline/dates/">Dates</a>', tree)
        self.assertIn('<a class="tree-pick" href="/wiki/projects/">Projects</a><span class="count">4</span>', tree)

    def test_timeline_outside_tree_sections(self):
        """A page outside params.treeSections keeps its timeline."""
        html = (self.public / "notes" / "sample" / "index.html").read_text(encoding="utf-8")
        self.assertIn("data-page-timeline", html)
        self.assertNotIn('class="timeline fold tree"', html)

    def section(self, *path):
        return (self.public.joinpath(*path) / "index.html").read_text(encoding="utf-8")

    def test_section_tree(self):
        """A tree section's folder: its subtree after the index body — outside Pagefind's — first level open."""
        html = self.section("wiki", "site")
        tree = re.search(r'<section class="tree tree-content">.*?</section>', html, re.S)
        self.assertIsNotNone(tree, "no section tree")
        body = re.search(r'<div class="prose" data-pagefind-body>.*?</div>', html, re.S)
        self.assertLess(body.end(), tree.start(), "tree inside the indexed body")
        tree = tree[0]
        self.assertIn('<li class="tree-dir"><details open><summary class="tree-row">'
                      '<span class="tree-node" aria-hidden="true"></span><a class="tree-pick" href="/wiki/site/lists/">', tree)
        self.assertIn('<a href="/wiki/site/search/">Search</a>', tree)
        self.assertNotIn("/wiki/pipeline/", tree, "another folder's pages")
        # /wiki/: the whole tree, deeper folders shut.
        top = self.section("wiki")
        self.assertIn('<a class="tree-pick" href="/wiki/projects/publictxt/">', top)
        self.assertNotRegex(top, r'<details open><summary class="tree-row"><span class="tree-node" aria-hidden="true"></span>'
                                 r'<a class="tree-pick" href="/wiki/projects/publictxt/">')

    def test_section_tree_only_with_subfolders(self):
        """A flat tree-section folder, and a section outside treeSections: no tree."""
        self.assertNotIn('class="tree tree-content"', self.section("wiki", "site", "lists"))
        self.assertNotIn('class="tree tree-content"', self.section("notes"))


if __name__ == "__main__":
    unittest.main()
