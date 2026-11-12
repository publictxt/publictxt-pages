"""
test_sources.py — sources.py: follows, forks and the join between them
(PublicTxt spec §3.1, §3.2, §5.2, §5.4); and what sync writes from it.
"""

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from dates import DateResolver                                              # noqa: E402
from sources import canonical_repo_url, original_url, read_follows, source_of   # noqa: E402
from sync_content import drop_keys, sync                                    # noqa: E402

AT = "2025-01-01T12:00:00+00:00"
BLOB = "45498a3189372726335d411ad5c374efc656870d"
COMMIT = "85f3c01ab408f962ce6ba605e40c96f606e381f9"
REPO = "https://github.com/ann/notes"


class FixedDates(DateResolver):
    def __init__(self, src: Path):
        self.src = src
        self.shallow_clone = False
        self.built_at = AT
        self.git_times = {p.relative_to(src).as_posix(): (AT, AT) for p in src.rglob("*") if p.is_file()}


def follows(docs):
    return read_follows(docs)[0]


FOLLOWS = follows({
    "follows/Ann.md": {"url": REPO, "rating": "4"},
    "follows/vault.md": {"local": "true"},
})


def fork(**keys):
    return {"fork_path": "wiki/A b.md", "fork_blob": BLOB, **keys}


class CanonicalURLTest(unittest.TestCase):
    def test_forms(self):
        for url in ("https://GitHub.com/ann/notes", "https://github.com/ann/notes.git",
                    "https://github.com/ann/notes/", "https://github.com/ann/notes?tab=readme#top",
                    "git@github.com:ann/notes.git", "HTTPS://github.com/ann/notes"):
            with self.subTest(url):
                self.assertEqual(canonical_repo_url(url), REPO)

    def test_owner_and_repo_keep_their_case(self):
        self.assertEqual(canonical_repo_url("https://github.com/Ann/Notes"), "https://github.com/Ann/Notes")

    def test_invalid(self):
        for url in ("", "file:///home/ann/notes", "http://github.com/ann/notes", "https://github.com/ann",
                    "https://gitlab.com/group/sub/repo", "ann/notes"):
            with self.subTest(url):
                self.assertEqual(canonical_repo_url(url), "")


class FollowsTest(unittest.TestCase):
    def test_name_is_the_file_name_at_any_depth(self):
        got = follows({"follows/people/Ann Notes.md": {"url": REPO}})
        self.assertEqual(got["ann notes"].name, "Ann Notes")

    def test_plain_documents_are_not_follows(self):
        self.assertEqual(follows({"follows/about.md": {}, "follows/x.md": {"local": "false"}}), {})

    def test_invalid_url_warns(self):
        got, warnings = read_follows({"follows/a.md": {"url": "file:///x", "local": "true"}})
        self.assertEqual(got, {})
        self.assertEqual(len(warnings), 1)

    def test_first_by_path_wins_a_url_and_a_name(self):
        got, warnings = read_follows({
            "follows/b.md": {"url": REPO + ".git"}, "follows/a.md": {"url": REPO},
            "follows/sub/A.md": {"url": "https://github.com/other/repo"}})
        self.assertEqual(list(got), ["a"])
        self.assertEqual(got["a"].path, "follows/a.md")
        self.assertEqual(len(warnings), 2)

    def test_rating(self):
        got = follows({"follows/a.md": {"url": REPO, "rating": "6"}, "follows/b.md": {"local": "true", "rating": "2"}})
        self.assertEqual((got["a"].rating, got["b"].rating), (0, 2))


class SourceTest(unittest.TestCase):
    def test_own_document(self):
        self.assertIsNone(source_of({}, FOLLOWS))
        self.assertIsNone(source_of({"fork_remote": "ann"}, FOLLOWS), "no fork_path, no fork_blob")
        self.assertIsNone(source_of(fork(fork_remote="ann", fork_blob="nope"), FOLLOWS))
        self.assertIsNone(source_of(fork(), FOLLOWS), "neither fork_remote nor fork_repo")

    def test_by_remote_name_without_case(self):
        s = source_of(fork(fork_remote="ANN"), FOLLOWS)
        self.assertEqual((s.name, s.rating, s.follow.path), ("Ann", 4, "follows/Ann.md"))

    def test_by_repo_when_no_remote(self):
        s = source_of(fork(fork_repo=REPO + ".git"), FOLLOWS)
        self.assertEqual((s.name, s.rating), ("Ann", 4))

    def test_remote_beats_repo(self):
        s = source_of(fork(fork_remote="vault", fork_repo=REPO), FOLLOWS)
        self.assertEqual((s.name, s.rating), ("vault", 0))

    def test_no_follow(self):
        s = source_of(fork(fork_remote="gone", fork_repo=REPO), FOLLOWS)
        self.assertEqual((s.name, s.rating, s.follow), ("gone", 0, None), "a renamed follow: not matched by URL")
        s = source_of(fork(fork_repo="https://github.com/bob/txt"), FOLLOWS)
        self.assertEqual((s.name, s.original), ("https://github.com/bob/txt",) * 2)

    def test_original(self):
        s = source_of(fork(fork_remote="ann", fork_repo=REPO, fork_commit=COMMIT, fork_branch="main"), FOLLOWS)
        self.assertEqual(s.original, f"{REPO}/blob/{COMMIT}/wiki/A%20b.md")
        s = source_of(fork(fork_remote="ann"), FOLLOWS)
        self.assertEqual(s.original, REPO, "the follow's URL; no ref: the repo")
        self.assertEqual(source_of(fork(fork_remote="vault"), FOLLOWS).original, "")

    def test_original_url_per_forge(self):
        self.assertEqual(original_url("https://gitlab.com/a/b", "x.md", branch="main"),
                         "https://gitlab.com/a/b/-/blob/main/x.md")
        self.assertEqual(original_url("https://codeberg.org/a/b", "x.md", commit=COMMIT),
                         f"https://codeberg.org/a/b/src/commit/{COMMIT}/x.md")
        self.assertEqual(original_url("https://codeberg.org/a/b", "x.md", branch="feat/x"),
                         "https://codeberg.org/a/b/src/branch/feat/x/x.md")
        self.assertEqual(original_url("https://git.example.org/a/b", "x.md", commit=COMMIT),
                         "https://git.example.org/a/b")


class SyncTest(unittest.TestCase):
    def synced(self, files: dict[str, str]) -> tuple[dict[str, str], str]:
        with tempfile.TemporaryDirectory() as tmp:
            src, out = Path(tmp) / "src", Path(tmp) / "out" / "content"
            for rel, text in files.items():
                (src / rel).parent.mkdir(parents=True, exist_ok=True)
                (src / rel).write_text(text, encoding="utf-8")
            err = io.StringIO()
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(err):
                sync(src, out, FixedDates(src))
            return {p.relative_to(out).as_posix(): p.read_text(encoding="utf-8") for p in out.rglob("*.md")}, err.getvalue()

    FORK = f"---\nfork_remote: ann\nfork_path: a.md\nfork_blob: {BLOB}\n---\nbody\n"

    def test_unpublished_follow_still_rates_but_is_not_linked(self):
        pages, err = self.synced({"follows/ann.md": f"---\nurl: {REPO}\nrating: 5\npublish: off\n---\n", "a.md": self.FORK})
        self.assertIn("source_name: \"ann\"\nsource_rating: 5\nsource_original:", pages["a.md"])
        self.assertNotIn("source_follow", pages["a.md"])
        self.assertEqual(err, "")

    def test_fork_remote_without_a_follow_warns(self):
        pages, err = self.synced({"a.md": self.FORK})
        self.assertIn('source_name: "ann"\n---', pages["a.md"])
        self.assertIn("a.md: fork_remote 'ann' names no follow", err)

    def test_own_page_has_no_source_keys(self):
        pages, _ = self.synced({"a.md": "---\nsource_rating: 5\nsource_original:\n  - x\nweb: y\n---\nbody\n"})
        self.assertNotIn("source_", pages["a.md"].replace("source_path", "").replace("created_source", ""))
        self.assertIn("web: y", pages["a.md"])

    def test_follow_url_replaces_url(self):
        """Hugo takes `url:` for the page's own address (and panics on this one)."""
        pages, _ = self.synced({"follows/ann.md": "---\nurl: git@github.com:ann/notes.git\n---\n",
                                "follows/note.md": "---\nurl: /elsewhere/\n---\n"})
        self.assertIn(f'follow_url: "{REPO}"', pages["follows/ann.md"])
        self.assertNotIn("\nurl:", pages["follows/ann.md"] + pages["follows/note.md"])

    def test_drop_keys(self):
        self.assertEqual(drop_keys("a: 1\nsource_name:\n  - x\n- y\nb: 2\nsource_rating: 3", ("source_name", "source_rating")),
                         "a: 1\nb: 2")


if __name__ == "__main__":
    unittest.main()
