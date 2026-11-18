"""
test_folder_index.py — a note flagged `is-folder-index: true` is written as its
folder's `_index.md`, and links to it follow.
"""

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from sync_content import retarget_links, sync   # noqa: E402
from tests.test_exclude import FixedDates       # noqa: E402

FLAG = "---\nis-folder-index: true\n---\n"


def synced(files: dict[str, str]) -> tuple[dict[str, str], str]:
    """Sync a made-up repo; its output files' text, and sync's warnings."""
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp) / "src", Path(tmp) / "out" / "content"
        for rel, text in files.items():
            (src / rel).parent.mkdir(parents=True, exist_ok=True)
            (src / rel).write_text(text, encoding="utf-8")
        err = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(err):
            sync(src, out, FixedDates(src))
        return ({p.relative_to(out).as_posix(): p.read_text(encoding="utf-8")
                 for p in out.rglob("*.md")}, err.getvalue())


class FolderIndexTest(unittest.TestCase):
    def test_flagged_note_is_the_folder_index(self):
        out, _ = synced({"wiki/Wiki.md": FLAG + "Intro.\n", "wiki/Page.md": "x\n"})
        self.assertNotIn("wiki/Wiki.md", out)
        index = out["wiki/_index.md"]
        self.assertIn('title: "Wiki"', index, "its own name, not the folder's")
        self.assertIn('source_path: "wiki/Wiki.md"', index, "the edit link reaches the real file")
        self.assertIn("Intro.", index)

    def test_root_note(self):
        out, _ = synced({"Home.md": FLAG + "Hi\n"})
        self.assertIn('source_path: "Home.md"', out["_index.md"])

    def test_values(self):
        for value, flagged in (("yes", True), ('"true"', True), ("false", False), ("", False)):
            out, _ = synced({"a/N.md": f"---\nis-folder-index: {value}\n---\n"})
            self.assertEqual("a/N.md" not in out, flagged, value)

    def test_real_index_wins(self):
        out, err = synced({"a/_index.md": "Real\n", "a/N.md": FLAG})
        self.assertIn("Real", out["a/_index.md"])
        self.assertIn("a/N.md", out)
        self.assertIn("a/N.md: is-folder-index", err)

    def test_unpublished_real_index_yields(self):
        out, _ = synced({"a/_index.md": "---\npublish: off\n---\n", "a/N.md": FLAG})
        self.assertIn('source_path: "a/N.md"', out["a/_index.md"])

    def test_first_flagged_wins(self):
        out, err = synced({"a/A.md": FLAG, "a/B.md": FLAG})
        self.assertIn('source_path: "a/A.md"', out["a/_index.md"])
        self.assertIn("a/B.md", out)
        self.assertIn("a/A.md is the folder's index already", err)

    def test_unpublished_flagged_is_no_index(self):
        out, _ = synced({"a/N.md": "---\nis-folder-index: true\npublish: off\n---\n", "a/P.md": "x\n"})
        self.assertNotIn("source_path", out["a/_index.md"], "generated")

    def test_links_follow(self):
        out, _ = synced({"a b/a b.md": FLAG, "a b/Sib.md": "[up](<a b.md>)\n",
                         "Top.md": "[x](a%20b/a%20b.md#h) ![](</a b/a b.md>) `[c](a b/a b.md)`\n"})
        self.assertIn("[up](<_index.md>)", out["a b/Sib.md"])
        top = out["Top.md"]
        self.assertIn("[x](a%20b/_index.md#h)", top)
        self.assertIn("![](</a b/_index.md>)", top)
        self.assertIn("`[c](a b/a b.md)`", top, "code stays as written")


class RetargetTest(unittest.TestCase):
    MOVED = {"w/w.md": "w/_index.md"}

    def test_relative_and_case(self):
        self.assertEqual(retarget_links("[a](../w/W.md)", "x/p.md", self.MOVED), "[a](../w/_index.md)")

    def test_others_untouched(self):
        for body in ("[a](w/other.md)", "[a](https://e.com/w/w.md)", "w/w.md", "[a](w/w.md.png)"):
            self.assertEqual(retarget_links(body, "p.md", self.MOVED), body)


if __name__ == "__main__":
    unittest.main()
