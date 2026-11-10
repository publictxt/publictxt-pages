"""
test_title.py — derive_title: a `# H1` is the title only on the body's first
non-blank line; anywhere else it stays a heading and the file name is the title.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from sync_content import derive_title  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
