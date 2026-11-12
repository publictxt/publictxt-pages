"""
sources.py — a document's source: the repo its text came from, and this
author's rating of that repo. PublicTxt spec §5.4 (ADR-0016): computed when
reading, never written to the source repo — sync writes them to build/content.

  * A follow is a document in `follows/` (any depth) with a valid `url`
    (§3.2). Its name is its file name without `.md`; names and URLs compare
    as the spec says (names without case, URLs in canonical form, §3.1).
    A document there with `local: true` and no `url` is a follow too, of a
    repo with no public URL — the spec leaves that to tools; forks name it by
    `fork_remote` like any other.
  * A fork has a valid `fork_path` and `fork_blob`, and a valid `fork_repo`
    or a `fork_remote` (§5.2).
  * A fork's follow: the one named by `fork_remote`; with no `fork_remote`,
    the one whose `url` is `fork_repo`.
  * Source: the follow's name; with no follow, `fork_remote`, else
    `fork_repo`. Source rating: the follow's `rating` (1–5), else unrated.
  * A document that is not a fork is this repo's: `source_of()` is None.

`original_url()` is the link back: the forked file on a forge whose URLs we
know, else the repo, else nothing (a local follow has no URL).

Takes front matter as a dict of raw scalar strings (KEYS), so it parses nothing.
"""

import re
from dataclasses import dataclass
from urllib.parse import quote

FOLLOWS_DIR = "follows"
FOLLOW_KEYS = ("url", "local", "rating")
FORK_KEYS = ("fork_remote", "fork_repo", "fork_path", "fork_branch", "fork_commit", "fork_blob")
KEYS = FOLLOW_KEYS + FORK_KEYS

HTTPS_RE = re.compile(r"^https://([^/\s:@]+)/([^/\s?#]+)/([^/\s?#]+?)(?:\.git)?/?(?:[?#]\S*)?$", re.IGNORECASE)
SSH_RE = re.compile(r"^git@([^/\s:@]+):([^/\s?#]+)/([^/\s?#]+?)(?:\.git)?/?$")
SHA_RE = re.compile(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$", re.IGNORECASE)
TRUE = {"true", "yes", "on", "1"}

# host -> the forked file's URL at a commit / on a branch. Other hosts: the repo.
FORGES = {
    "github.com": ("{repo}/blob/{ref}/{path}", "{repo}/blob/{ref}/{path}"),
    "gitlab.com": ("{repo}/-/blob/{ref}/{path}", "{repo}/-/blob/{ref}/{path}"),
    "codeberg.org": ("{repo}/src/commit/{ref}/{path}", "{repo}/src/branch/{ref}/{path}"),
}


@dataclass(frozen=True)
class Follow:
    name: str            # file name without .md, as cased
    path: str            # source path, e.g. follows/ann-notes.md
    url: str             # canonical repo URL; "" for a local follow
    rating: int          # 1–5; 0 unrated


@dataclass(frozen=True)
class Source:
    name: str            # the label: the follow's name, else fork_remote, else fork_repo
    rating: int          # 1–5; 0 unrated
    follow: Follow | None
    original: str        # URL of the forked file, or of its repo; "" if neither is known


def canonical_repo_url(url: str) -> str:
    """§3.1: `https://<host>/<owner>/<repo>`, host lower-cased; "" if invalid."""
    m = HTTPS_RE.match(url.strip()) or SSH_RE.match(url.strip())
    return f"https://{m.group(1).lower()}/{m.group(2)}/{m.group(3)}" if m else ""


def rating_of(value: str) -> int:
    return int(value) if re.fullmatch(r"[1-5]", value.strip()) else 0


def read_follows(docs: dict[str, dict[str, str]]) -> tuple[dict[str, Follow], list[str]]:
    """Follows by case-folded name, from {source path: front matter values} of
    the documents in `follows/`; and warnings. The first by path wins a name or a URL."""
    follows: dict[str, Follow] = {}
    urls: dict[str, str] = {}
    warnings = []
    for path in sorted(docs):
        fm = docs[path]
        name = path.rsplit("/", 1)[-1].removesuffix(".md")
        url = canonical_repo_url(fm.get("url", ""))
        if not url:
            if fm.get("url"):
                warnings.append(f"{path}: url is not a repo URL (https://<host>/<owner>/<repo>) — not a follow")
                continue
            if fm.get("local", "").lower() not in TRUE:
                continue                       # a plain document: follows/_index.md, notes
        if name.casefold() in follows:
            warnings.append(f"{path}: a follow named {name!r} already exists "
                            f"({follows[name.casefold()].path}) — ignored")
            continue
        if url and url in urls:
            warnings.append(f"{path}: {url} is already followed by {urls[url]} — ignored")
            continue
        follows[name.casefold()] = Follow(name, path, url, rating_of(fm.get("rating", "")))
        if url:
            urls[url] = path
    return follows, warnings


def is_fork(fm: dict[str, str]) -> bool:
    return bool(fm.get("fork_path") and SHA_RE.match(fm.get("fork_blob", ""))
                and (fm.get("fork_remote") or canonical_repo_url(fm.get("fork_repo", ""))))


def original_url(repo: str, path: str, commit: str = "", branch: str = "") -> str:
    """The forked file at the commit it was forked from (a link that can't
    move), else on its branch; the repo where the host's URLs aren't known."""
    forge = FORGES.get(repo.removeprefix("https://").split("/", 1)[0])
    ref = commit if SHA_RE.match(commit) else branch
    if not (repo and forge and path and ref):
        return repo
    template = forge[0] if ref == commit else forge[1]
    return template.format(repo=repo, ref=quote(ref, safe="/"), path=quote(path, safe="/"))


def source_of(fm: dict[str, str], follows: dict[str, Follow]) -> Source | None:
    """A fork's source; None for this repo's own documents."""
    if not is_fork(fm):
        return None
    remote = fm.get("fork_remote", "")
    repo = canonical_repo_url(fm.get("fork_repo", ""))
    if remote:
        follow = follows.get(remote.casefold())
    else:
        follow = next((f for f in follows.values() if f.url == repo), None)
    original = original_url(repo or (follow.url if follow else ""), fm["fork_path"],
                            fm.get("fork_commit", ""), fm.get("fork_branch", ""))
    if follow:
        return Source(follow.name, follow.rating, follow, original)
    return Source(remote or repo, 0, None, original)
