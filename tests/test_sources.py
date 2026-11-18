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
from sources import (canonical_repo_url, mirror_folders, original_url, page_original,   # noqa: E402
                     read_follows, source_of)
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

    def test_mirror(self):
        """`mirror_*` reads as `fork_*` does, and says it is a mirror; fork keys win."""
        mirror = {"mirror_path": "wiki/A b.md", "mirror_blob": BLOB}
        self.assertIsNone(source_of(mirror, FOLLOWS), "neither mirror_remote nor mirror_repo")
        self.assertIsNone(source_of({**mirror, "mirror_remote": "ann", "mirror_blob": "nope"}, FOLLOWS))
        s = source_of({**mirror, "mirror_remote": "ANN", "mirror_repo": REPO, "mirror_commit": COMMIT}, FOLLOWS)
        self.assertEqual((s.name, s.rating, s.kind, s.follow.path), ("Ann", 4, "mirror", "follows/Ann.md"))
        self.assertEqual(s.original, f"{REPO}/blob/{COMMIT}/wiki/A%20b.md")
        self.assertEqual(source_of({**mirror, "mirror_repo": REPO + ".git"}, FOLLOWS).name, "Ann")
        self.assertEqual(source_of(fork(fork_remote="ann"), FOLLOWS).kind, "fork")
        both = source_of({**mirror, "mirror_remote": "vault", **fork(fork_remote="ann")}, FOLLOWS)
        self.assertEqual((both.name, both.kind), ("Ann", "fork"))

    def test_mirror_folders(self):
        """`<community>/<folder>`, the follow's `folder` key, else its name; "" community: the root."""
        fs = follows({"follows/Ann.md": {"url": REPO, "folder": "/Ann Notes/"}, "follows/vault.md": {"local": "true"}})
        self.assertEqual({k: f.name for k, f in mirror_folders(fs, "people/community").items()},
                         {"people/community/ann notes": "Ann", "people/community/vault": "vault"})
        self.assertEqual(set(mirror_folders(fs, "")), {"ann notes", "vault"})

    def test_page_original(self):
        """At the commit of a page from the same follow; else the followed branch; else the repo."""
        ann = follows({"follows/Ann.md": {"url": REPO, "branch": "dev"}})["ann"]
        s = source_of({"mirror_remote": "ann", "mirror_path": "x.md", "mirror_blob": BLOB, "mirror_commit": COMMIT}, {"ann": ann})
        self.assertEqual(page_original(ann, "cs/b c.md", s), f"{REPO}/blob/{COMMIT}/cs/b%20c.md")
        self.assertEqual(page_original(ann, "cs/b.md"), f"{REPO}/blob/dev/cs/b.md")
        self.assertEqual(page_original(FOLLOWS["ann"], "cs/b.md"), REPO)
        self.assertEqual(page_original(FOLLOWS["vault"], "cs/b.md"), "")

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

    def test_mirror_is_marked_and_warns_like_a_fork(self):
        mirror = f"---\nmirror_remote: ann\nmirror_path: a.md\nmirror_blob: {BLOB}\nsource_kind: fork\n---\nbody\n"
        pages, err = self.synced({"follows/ann.md": f"---\nurl: {REPO}\nrating: 5\n---\n", "community/ann/a.md": mirror, "a.md": self.FORK})
        self.assertIn("source_kind: mirror\n", pages["community/ann/a.md"])
        self.assertNotIn("source_kind: fork", pages["community/ann/a.md"], "authored, so dropped")
        self.assertIn('source_follow: "follows/ann.md"', pages["community/ann/a.md"])
        self.assertNotIn("source_kind", pages["a.md"], "a fork is the default")
        self.assertEqual(err, "")
        _, err = self.synced({"community/ann/a.md": mirror})
        self.assertIn("community/ann/a.md: mirror_remote 'ann' names no follow", err)

    def test_own_page_has_no_source_keys(self):
        pages, _ = self.synced({"a.md": "---\nsource_rating: 5\nsource_original:\n  - x\nweb: y\n---\nbody\n"})
        self.assertNotIn("source_", pages["a.md"].replace("source_path", "").replace("created_source", ""))
        self.assertIn("web: y", pages["a.md"])

    def test_follow_url_replaces_url(self):
        """Hugo takes `url:` for the page's own address (and panics on this one)."""
        pages, _ = self.synced({"follows/ann.md": "---\nurl: git@github.com:ann/notes.git\n---\n",
                                "follows/note.md": "---\nurl: /elsewhere/\n---\n"})
        self.assertIn(f'follow_name: "ann"\nfollow_url: "{REPO}"', pages["follows/ann.md"])
        self.assertNotIn("follow_name", pages["follows/note.md"])
        self.assertNotIn("\nurl:", pages["follows/ann.md"] + pages["follows/note.md"])

    ANN = f"---\nurl: {REPO}\nfolder: ann-notes\n---\n"
    MIRROR = f"---\nmirror_remote: ann\nmirror_path: wiki/a.md\nmirror_blob: {BLOB}\nmirror_commit: {COMMIT}\n---\n"

    def test_community_folder(self):
        """Pages in params.communityFolder, nested or not, generated indexes too, are `in_community`."""
        pages, _ = self.synced({"settings/site.toml": '[params]\ncommunityFolder = "/shared/community/"\n',
                                "shared/community/ann/a.md": "x", "shared/own.md": "x"})
        for rel in ("shared/community/ann/a.md", "shared/community/ann/_index.md", "shared/community/_index.md"):
            self.assertIn("in_community: true", pages[rel], rel)
        for rel in ("shared/own.md", "shared/_index.md"):
            self.assertNotIn("in_community", pages[rel], rel)

    def test_community_folder_at_the_root(self):
        """"": the follows' mirror folders, by `folder` or name."""
        pages, _ = self.synced({"settings/site.toml": '[params]\ncommunityFolder = ""\n', "follows/ann.md": self.ANN,
                                "ann-notes/wiki/a.md": self.MIRROR, "wiki/b.md": "x"})
        self.assertIn("in_community: true", pages["ann-notes/wiki/a.md"])
        self.assertNotIn("in_community", pages["wiki/b.md"] + pages["follows/ann.md"])

    def test_authored_in_community_is_dropped(self):
        pages, _ = self.synced({"a.md": "---\nin_community: true\n---\nx"})
        self.assertNotIn("in_community", pages["a.md"])

    def test_links_to_pages_not_mirrored_go_to_the_original(self):
        body = ("[here](community/ann-notes/wiki/b.md) [gone](<community/ann-notes/cs/no such.md#h>) "
                "[rel](../cs/c.md) [up](/community/ann-notes/x.md) `[code](community/ann-notes/y.md)` "
                "[web](https://x.org/community/ann-notes/q.md) ![](community/ann-notes/e%20f.md) ![shown](community/ann-notes/g.md)")
        pages, _ = self.synced({"follows/ann.md": self.ANN, "community/ann-notes/wiki/a.md": self.MIRROR + body,
                                "community/ann-notes/wiki/b.md": "x",
                                "own.md": "[m](community/ann-notes/cs/d.md) [n](<community/ann-notes/wiki/b.md>) [bob](community/bob/z.md)"})
        a = pages["community/ann-notes/wiki/a.md"]
        at = f"{REPO}/blob/{COMMIT}"
        self.assertIn("[here](community/ann-notes/wiki/b.md)", a, "mirrored: kept")
        self.assertIn(f"[gone](<{at}/cs/no%20such.md>)", a, "the mirror's commit; the heading dropped")
        self.assertIn(f"[rel]({at}/cs/c.md)", a, "relative, as Hugo reads it")
        self.assertIn(f"[up]({at}/x.md)", a)
        self.assertIn("`[code](community/ann-notes/y.md)`", a)
        self.assertIn("[web](https://x.org/community/ann-notes/q.md)", a)
        self.assertIn(f" [e f]({at}/e%20f.md) [shown]({at}/g.md)", a, "an embed: a link")
        self.assertIn(f"[m]({REPO})", pages["own.md"], "not the follow's page: no commit; no branch: the repo")
        self.assertIn("[n](<community/ann-notes/wiki/b.md>)", pages["own.md"])
        self.assertIn("[bob](community/bob/z.md)", pages["own.md"], "no follow's mirror folder")

    def test_links_to_a_local_follows_mirror_folder_are_left(self):
        pages, _ = self.synced({"follows/vault.md": "---\nlocal: true\n---\n", "a.md": "[x](community/vault/x.md)"})
        self.assertIn("[x](community/vault/x.md)", pages["a.md"])

    def test_drop_keys(self):
        self.assertEqual(drop_keys("a: 1\nsource_name:\n  - x\n- y\nb: 2\nsource_rating: 3", ("source_name", "source_rating")),
                         "a: 1\nb: 2")


if __name__ == "__main__":
    unittest.main()
