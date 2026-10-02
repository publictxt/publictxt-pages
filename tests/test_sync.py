"""
test_sync.py — front matter sync rewrites so Hugo reads a note as Obsidian
meant it. (Dates: test_dates.py; tags: test_hashtags.py and the golden test.)
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from sync_content import Stamp, normalise_md  # noqa: E402

STAMP = Stamp("2026-10-02", "front-matter", "2026-10-02", True)


def synced_front_matter(fm: str) -> list[str]:
    page = normalise_md(f"---\n{fm}\n---\nx\n", "notes/a.md", STAMP)
    return page.split("---\n")[1].splitlines()


class Published(unittest.TestCase):
    """Hugo reads `published:` as not-`draft:`: empty, it drops the page unannounced."""

    def test_empty_is_dropped(self):
        for line in ("published:", "published: ", "Published:", "published: ~", "published: null"):
            with self.subTest(line):
                self.assertNotIn(line.strip(), [l.strip() for l in synced_front_matter(f"{line}\nauthor:")])

    def test_values_are_kept(self):
        # false hides the page, as Jekyll's `published: false` and our `publish: false` do.
        for line in ("published: false", "published: true", "published: 2024-05-01", 'published: ""'):
            with self.subTest(line):
                self.assertIn(line, synced_front_matter(line))


if __name__ == "__main__":
    unittest.main()
