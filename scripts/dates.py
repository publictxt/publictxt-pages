#!/usr/bin/env python3
"""
dates.py

Single source of truth for resolving a page's `created` and `updated` times
(see docs/wiki/features/dates.md). Used by sync_content.py; kept separate
for the same reason as hashtags.py — one definition, so nothing downstream can
disagree about when a page is from.

Every page ends up with both. `created` says when the page was written,
`updated` when it last changed; lists sort on `updated`.

`created`, most to least authoritative:

  1. `front-matter`  an explicit `created:` (or legacy `date:`) in the source
  2. `path`          a date in the file name or path             — YYYYMMDD or
                     YYYY-MM-DD anywhere in the stem, or .../YYYY/MM/DD/
  3. `git`           the first commit that touched the source file
  4. `mtime`         the file's birth time where the OS reports one, else its
                     modification time (untracked or uncommitted files)
  5. `build`         the time of this build                      — last resort

`updated`:

  1. an explicit `updated:` (or legacy `lastmod:`) in the source
  2. the last commit that touched the source file
  3. the file's modification time
  4. the time of this build

Section indexes (`_index.md`) whose `updated` was inferred take the newest
`updated` among their descendants when that is later, so a section reads as
recent when its contents are, not only when its landing page was touched.

The rung `created` came from is written alongside it as `created_source:`.
It is not used by templates; it makes a bad inference visible in the generated
front matter rather than silently wrong in a listing.

Note for CI: a shallow checkout (`fetch-depth: 1`, the actions/checkout
default) has one commit, so every tracked file reports that commit's time for
both ends and rung 3 collapses into a single timestamp. sync warns when it
sees one; use `fetch-depth: 0`.
"""

import re
import subprocess
from datetime import date as _date, datetime, timezone
from pathlib import Path

# A date in a file name: `20241013-title`, `title . 20240816`, `2024-10-13-title`.
# The digit guards stop longer runs of digits (IDs, ISBNs) from matching.
NAME_DATE_RES = (
    re.compile(r"(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)"),
    re.compile(r"(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)"),
)
# A date in the path: `blog/2023/12/17/post.md`. No longer blog-only.
PATH_DATE_RE = re.compile(r"(?:^|/)(\d{4})/(\d{2})/(\d{2})/")

# Separates a commit header from the file names that follow it in `git log`
# output — a file could otherwise be named like a date.
NUL = chr(0)


def _valid(y: str, m: str, d: str) -> str | None:
    try:
        return _date(int(y), int(m), int(d)).isoformat()
    except ValueError:
        return None  # e.g. `2023-Week50`, `Room 20240000`


def date_from_path(rel: str) -> str | None:
    """Date derived from a file's name or the folders above it, else None."""
    stem = Path(rel).stem
    for pattern in NAME_DATE_RES:
        m = pattern.search(stem)
        if m and (iso := _valid(*m.groups())):
            return iso
    m = PATH_DATE_RE.search(rel)
    if m and (iso := _valid(*m.groups())):
        return iso
    return None


def _git(src: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "core.quotepath=false", "-C", str(src), *args],
        capture_output=True, text=True, check=True, encoding="utf-8",
    ).stdout


def git_commit_times(src: Path) -> tuple[dict[str, tuple[str, str]], bool]:
    """
    Map every tracked file under `src` to the ISO 8601 times of the first and
    last commit that touched it, as (created, updated), in one `git log` pass.
    Returns ({}, False) when `src` is not a Git working tree or Git is
    unavailable — an unversioned source repo is supported, it just falls
    through to the next rung.

    Renames are not followed: a renamed file is "created" by the rename.

    The second element is True when the repo is a shallow clone, in which case
    the times are all but meaningless (see the module docstring).
    """
    try:
        # Paths in `git log` output are relative to the repo root, which may sit
        # above `src`; this is the part to strip back off.
        prefix = _git(src, "rev-parse", "--show-prefix").strip()
        shallow = _git(src, "rev-parse", "--is-shallow-repository").strip() == "true"
        out = _git(src, "log", "--format=%x00%cI", "--name-only", "--no-renames", "--", ".")
    except (OSError, subprocess.CalledProcessError):
        return {}, False

    times: dict[str, tuple[str, str]] = {}
    current = ""
    for line in out.splitlines():
        if line.startswith(NUL):
            current = line[1:].strip()
        elif line and current:
            if prefix and not line.startswith(prefix):
                continue
            rel = line[len(prefix):]
            # `git log` is newest-first: the first sighting is `updated`, and
            # every later (older) sighting pushes `created` back.
            updated = times[rel][1] if rel in times else current
            times[rel] = (current, updated)
    return times, shallow


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts).astimezone().replace(microsecond=0).isoformat()


def build_time() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


class DateResolver:
    """Walks both ladders for one source repo. Construct once per sync."""

    def __init__(self, src: Path):
        self.src = src
        self.git_times, self.shallow_clone = git_commit_times(src)
        self.built_at = build_time()

    def created(self, path: Path, rel: str) -> tuple[str, str]:
        """(iso_time, source) for a source file with no explicit `created:`."""
        if iso := date_from_path(rel):
            return iso, "path"
        if git := self.git_times.get(rel):
            return git[0], "git"
        try:
            st = path.stat()
        except OSError:
            return self.built_at, "build"
        # Birth time is only reported on some platforms (Windows, macOS, BSD).
        born = getattr(st, "st_birthtime", None)
        return _iso(born if born else st.st_mtime), "mtime"

    def updated(self, path: Path, rel: str) -> str:
        """ISO time a source file last changed, for one with no explicit `updated:`."""
        if git := self.git_times.get(rel):
            return git[1]
        try:
            return _iso(path.stat().st_mtime)
        except OSError:
            return self.built_at


# Anything unparseable sorts last — an author's odd `created:` is Hugo's problem
# to report, not a reason for the sync step to abort.
UNDATED = datetime.min.replace(tzinfo=timezone.utc)


def sort_key(iso: str) -> datetime:
    """Comparable value for any rung's output. A date-only rung means midnight local."""
    try:
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return UNDATED
    return dt if dt.tzinfo else dt.astimezone()
