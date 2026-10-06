"""
test_hashtags.py — merge_tags (hashtags.py): front matter `tags` that already
carry a `#` (Obsidian's `- #tag`) lose it, so pages don't show `##tag`.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from hashtags import merge_tags  # noqa: E402


class MergeTagsTest(unittest.TestCase):
    def test_hash_prefixed_block_items_lose_the_hash(self):
        fm = ["tags:", "  - goodtag", '  - "#badtag"']
        self.assertEqual(merge_tags(fm, ""), ['tags: ["goodtag", "badtag"]'])

    def test_hash_prefixed_inline_items_lose_the_hash(self):
        self.assertEqual(merge_tags(['tags: ["#a", "b"]'], ""), ['tags: ["a", "b"]'])

    def test_clean_tags_keep_their_block_style(self):
        fm = ["tags:", "  - good"]
        self.assertEqual(merge_tags(fm, ""), fm)

    def test_cleaned_tag_dedupes_against_body_hashtag(self):
        self.assertEqual(merge_tags(['tags: ["#a"]'], "text #a"), ['tags: ["a"]'])


if __name__ == "__main__":
    unittest.main()
