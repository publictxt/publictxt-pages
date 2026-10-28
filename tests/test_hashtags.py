"""
test_hashtags.py — merge_tags (hashtags.py): front matter `tags` that already
carry a `#` (Obsidian's `- #tag`) lose it, so pages don't show `##tag`; nested
tags (`dev/app`) are stored as flat term keys.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from hashtags import find_hashtags, linkify, merge_tags, term_titles  # noqa: E402


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


class NestedTagsTest(unittest.TestCase):
    def test_hashtag_keeps_its_nesting(self):
        self.assertEqual(find_hashtags("#dev/app, #dev/ and #a/b/c."), ["dev/app", "dev", "a/b/c"])

    def test_linkify_uses_the_flat_path(self):
        self.assertEqual(linkify("see #Dev/App"), "see [#Dev/App](/tags/dev--app/)")

    def test_front_matter_and_body_tags_stored_flat(self):
        fm = ["tags:", "  - dev", '  - "#dev/app/"']
        self.assertEqual(merge_tags(fm, "#dev/web"), ['tags: ["dev", "dev--app", "dev--web"]'])

    def test_nested_tags_keep_their_names_as_titles(self):
        self.assertEqual(term_titles(["dev", "Dev/App"]), {"dev--app": "Dev/App"})


if __name__ == "__main__":
    unittest.main()
