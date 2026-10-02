"""
test_hashtags.py — what HASHTAG_RE (hashtags.py) counts as a tag. The golden
test covers the example's cases; fences are checked here, since a fence that
closes early turns the rest of a code sample into prose.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from hashtags import find_hashtags, linkify  # noqa: E402

DATAVIEW = "```dataview\nLIST FROM #recipes\n```"


class Fences(unittest.TestCase):
    def test_code_is_not_tags(self):
        for body in (f"{DATAVIEW}\n",
                     "~~~\n#notatag\n~~~\n",
                     "`#notatag` inline\n"):
            with self.subTest(body):
                self.assertEqual(find_hashtags(body), [])
                self.assertEqual(linkify(body), body)

    def test_longer_fence_holds_a_shorter_one(self):
        # A code sample of a code block: the outer fence ends at its own length.
        for outer in ("````", "~~~"):
            body = f"{outer}markdown\n{DATAVIEW}\n{outer}\n\nAfter: #real\n"
            with self.subTest(outer):
                self.assertEqual(find_hashtags(body), ["real"])
                self.assertEqual(linkify(body), body.replace("#real", "[#real](/tags/real/)"))


if __name__ == "__main__":
    unittest.main()
