"""
test_title.py — derive_title: a `# H1` is the title only on the body's first
non-blank line; anywhere else it stays a heading and the file name is the title.
`params.titleFromHeading = false` turns that off: the file name, the H1 kept.
"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from sync_content import Stamp, derive_title, normalise_md, title_from_heading  # noqa: E402


class DeriveTitleTest(unittest.TestCase):
    def check(self, body, title, rest):
        self.assertEqual(derive_title(body, "file"), (title, rest))

    def test_first_line_h1_is_the_title_and_leaves_the_body(self):
        self.check("# Title\n\nText\n", "Title", "Text\n")

    def test_blank_lines_and_up_to_three_spaces_before_it(self):
        self.check("\n\n   # Title  \r\nText", "Title", "Text")

    def test_closing_hashes_need_a_space(self):
        self.check("# C#\n", "C#", "")
        self.check("# Title ##\n", "Title", "")

    def test_h1_after_other_content_stays_a_heading(self):
        for body in ("[Back](../)\n\n# Title\n", "Intro\n# Title\n", "## Sub\n# Title\n"):
            self.check(body, "file", body)

    def test_not_an_h1(self):
        for body in ("    # indented code\n", "#\nNext line\n", "#hashtag\n"):
            self.check(body, "file", body)


class TitleFromHeadingTest(unittest.TestCase):
    STAMP = Stamp("2025-01-01", "git", "2025-01-01", False)

    def test_off_keeps_the_h1_and_titles_by_file_name(self):
        out = normalise_md("# Heading\n\nText\n", "notes/my-note.md", self.STAMP,
                           title_from_heading=False)
        self.assertIn('title: "my note"', out)
        self.assertIn("# Heading\n\nText", out)

    def test_on_by_default(self):
        out = normalise_md("# Heading\n\nText\n", "notes/my-note.md", self.STAMP)
        self.assertIn('title: "Heading"', out)
        self.assertNotIn("# Heading", out)

    def setting(self, toml):
        with tempfile.TemporaryDirectory() as tmp:
            if toml is not None:
                (Path(tmp) / "settings").mkdir()
                (Path(tmp) / "settings/site.toml").write_text(toml, encoding="utf-8")
            return title_from_heading(Path(tmp))

    def test_read_from_site_settings(self):
        self.assertTrue(self.setting(None))
        self.assertTrue(self.setting("[params]\n"))
        self.assertFalse(self.setting("[params]\ntitleFromHeading = false\n"))
        with self.assertRaises(SystemExit):
            self.setting('[params]\ntitleFromHeading = "no"\n')


if __name__ == "__main__":
    unittest.main()
