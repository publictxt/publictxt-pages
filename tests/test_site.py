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

    def test_index_text_is_plain(self):
        """index.json carries plain text (cards.js escapes it): no HTML entities left in summaries."""
        items = json.loads(self.index)
        self.assertEqual([it["url"] for it in items if re.search(r"&[a-z]+;|&#\d+;", it.get("summary", ""))], [])
        self.assertTrue(any("->" in it.get("summary", "") for it in items), "fixture lost its ->")

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

    # The folder tree's markup is read here, and only here (tree/row.html).
    def html(self, *path):
        return (self.public.joinpath(*path) / "index.html").read_text(encoding="utf-8")

    @staticmethod
    def rows(tree, state):
        """hrefs of a tree's folder rows that are `on` (the page's path) or `open` (any opened), in order."""
        li = r'<li class="tree-dir on-path">' if state == "on" else r'<li class="tree-dir[^"]*">'
        return re.findall(li + r'<details open><summary class="tree-row">[^\n]*?href="([^"]+)"', tree)

    @staticmethod
    def current(tree):
        return re.findall(r'<li class="tree-page current"><a href="([^"]+)" aria-current="page">', tree)

    def test_wiki_tree(self):
        """A wiki page: the folder tree, not the timeline — open along its path, the page marked."""
        html = self.html("wiki", "site", "lists", "browse-lists")
        tree = re.search(r'<details class="timeline fold tree".*?</nav>', html, re.S)
        self.assertIsNotNone(tree, "no folder tree")
        self.assertNotIn("data-page-timeline", html)
        tree = tree[0]
        self.assertEqual(self.rows(tree, "on"), ["/wiki/site/", "/wiki/site/lists/"])
        self.assertEqual(self.rows(tree, "open"), ["/wiki/site/", "/wiki/site/lists/"], "only the path open")
        self.assertEqual(self.current(tree), ["/wiki/site/lists/browse-lists/"])
        # Shut folders keep their pages, and counts.
        self.assertIn('<a href="/wiki/pipeline/dates/">Dates</a>', tree)
        self.assertIn('href="/wiki/projects/">Projects</a><span class="count">4</span>', tree)

    def test_timeline_outside_tree_sections(self):
        """A page outside params.treeSections keeps its timeline."""
        html = self.html("notes", "sample")
        self.assertIn("data-page-timeline", html)
        self.assertNotIn('class="timeline fold tree"', html)

    def test_section_tree(self):
        """A tree section's folder: its subtree after the index body — outside Pagefind's — first level open."""
        html = self.html("wiki", "site")
        tree = re.search(r'<details class="tree contents fold" open>.*?</nav>', html, re.S)
        self.assertIsNotNone(tree, "no section tree")
        body = re.search(r'<div class="prose" data-pagefind-body>.*?</div>', html, re.S)
        self.assertLess(body.end(), tree.start(), "tree inside the indexed body")
        tree = tree[0]
        self.assertEqual(self.rows(tree, "open"), ["/wiki/site/lists/"])
        self.assertEqual(self.rows(tree, "on") + self.current(tree), [], "nothing marked")
        self.assertIn('<a href="/wiki/site/search/">Search</a>', tree)
        self.assertNotIn("/wiki/pipeline/", tree, "another folder's pages")
        # /wiki/: the whole tree, one level open.
        top = re.search(r'<details class="tree contents fold" open>.*?</nav>', self.html("wiki"), re.S)[0]
        self.assertEqual(self.rows(top, "open"), ["/wiki/pipeline/", "/wiki/projects/", "/wiki/site/"])
        self.assertIn('href="/wiki/projects/publictxt/"', top)

    def test_folder_labels_keep_their_case(self):
        """A folder's label is its name as cased (wiki/Projects/PublicTxt/), in breadcrumbs and the tree."""
        html = self.html("wiki", "projects", "publictxt")
        self.assertIn('<li aria-current="page">PublicTxt</li>', html)
        self.assertIn('href="/wiki/projects/publictxt/">PublicTxt</a>', self.html("wiki"))
        self.assertIn('<a href="/blog/2023/">2023</a>', self.html("blog", "2023", "12"), "date folder humanized")

    def test_section_tree_only_with_subfolders(self):
        """A flat tree-section folder, and a section outside treeSections: no tree."""
        self.assertNotIn('class="tree contents', self.html("wiki", "site", "lists"))
        self.assertNotIn('class="tree contents', self.html("notes"))

    # A timeline section's contents (timeline/content.html).
    @staticmethod
    def contents(html):
        found = re.search(r'<details class="contents tl-contents fold" open>.*?</nav>', html, re.S)
        return found[0] if found else None

    def test_section_timeline(self):
        """A timeline section: its list by year and month, with titles, after the index body, the newest open."""
        html = self.html("blog")
        tl = self.contents(html)
        self.assertIsNotNone(tl, "no section timeline")
        body = re.search(r'<div class="prose" data-pagefind-body>.*?</div>', html, re.S)
        self.assertLess(body.end(), html.index(tl), "timeline inside the indexed body")
        # Years newest first, with counts; each label links to the list below at that date.
        self.assertEqual(re.findall(r'href="/blog/\?year=(\d{4})"[^\n]*\n.*?<span class="count">(\d+)</span>', tl, re.S),
                         [("2026", "3"), ("2024", "1"), ("2023", "2")])
        self.assertIn('href="/blog/?year=2026&month=09"', tl)
        # Only the newest year, and its newest month, open.
        self.assertEqual(re.findall(r'<li class="tl-(year|month)"><details open>', tl), ["year", "month"])
        # Titles newest first, each after its day, shown once per day.
        dec = tl[tl.index("month=12"):]
        self.assertRegex(dec, r'<span class="tl-day" aria-hidden="true">17</span><a href="[^"]+" title="17 Dec 2023">')
        self.assertEqual(dec.count(">17</span>"), 1, "a day shown twice")
        self.assertLess(tl.index("A post with full front matter"), tl.index("Choosing Hugo"))

    def test_section_timeline_only_across_months(self):
        """One month's folder, and sections outside timelineSections: no timeline in their content."""
        self.assertIsNone(self.contents(self.html("blog", "2023")), "one month: repeats the list")
        self.assertIsNone(self.contents(self.html("wiki")))
        self.assertIsNone(self.contents(self.html("notes")))

if __name__ == "__main__":
    unittest.main()
