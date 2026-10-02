"""
test_exclude.py — `params.excludeFolders` in the source repo's settings/site.toml:
sync leaves those folders out whole, notes and attachments, and nothing else.
"""

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from dates import DateResolver          # noqa: E402
from sync_content import sync           # noqa: E402

AT = "2025-01-01T12:00:00+00:00"


class FixedDates(DateResolver):
    def __init__(self, src: Path):
        self.src = src
        self.shallow_clone = False
        self.built_at = AT
        self.git_times = {p.relative_to(src).as_posix(): (AT, AT) for p in src.rglob("*") if p.is_file()}


def synced(files: dict[str, str], exclude) -> list[str]:
    """Sync a made-up repo; the output paths."""
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp) / "src", Path(tmp) / "out" / "content"
        for rel, text in files.items():
            (src / rel).parent.mkdir(parents=True, exist_ok=True)
            (src / rel).write_text(text, encoding="utf-8")
        if exclude is not None:
            (src / "settings").mkdir(exist_ok=True)
            (src / "settings/site.toml").write_text(f"[params]\nexcludeFolders = {exclude}\n", encoding="utf-8")
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            sync(src, out, FixedDates(src))
        return sorted(p.relative_to(out).as_posix() for p in out.rglob("*") if p.is_file())


REPO = {
    "settings/Templates/Daily.md": "# Daily\n",
    "settings/Templates/img.png": "x",
    "settings/Templates/Deep/Nested.md": "# Nested\n",
    "settings/Keep.md": "# Keep\n",
    "settings Notes/Other.md": "# Other\n",
    "notes/Templates/Real.md": "# Real\n",
    "Top.md": "# Top\n",
}


class ExcludeFoldersTest(unittest.TestCase):
    def test_subtree_goes_siblings_stay(self):
        out = synced(REPO, '["settings/Templates"]')
        self.assertFalse([p for p in out if "Templates/" in p and p.startswith("settings/")], out)
        self.assertIn("settings/Keep.md", out)
        self.assertIn("notes/Templates/Real.md", out)    # same name, other place
        self.assertIn("settings Notes/Other.md", out)    # prefix of a name isn't a folder prefix
        self.assertIn("Top.md", out)

    def test_no_setting_excludes_nothing(self):
        self.assertIn("settings/Templates/Daily.md", synced(REPO, None))

    def test_site_toml_is_not_content(self):
        # settings/ holds the config too: it's copied beside content, not synced as a page.
        out = synced(REPO, '["settings/Templates"]')
        self.assertNotIn("settings/site.toml", out)

    def test_slashes_and_case_are_forgiving(self):
        bs = chr(92)   # TOML literal string, so no escapes
        out = synced(REPO, "['/Settings" + bs + "templates/']")
        self.assertNotIn("settings/Templates/Daily.md", out)

    def test_excluded_folder_leaves_no_index(self):
        out = synced({"settings/Templates/Daily.md": "# D\n", "Top.md": "# T\n"}, '["settings/Templates"]')
        self.assertFalse([p for p in out if p.startswith("settings/")], out)

    def test_bad_value_stops_the_build(self):
        with self.assertRaises(SystemExit):
            synced(REPO, '"settings/Templates"')


if __name__ == "__main__":
    unittest.main()
