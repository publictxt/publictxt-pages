#!/usr/bin/env python3
"""
dates.py — the one definition of a page's `created` and `updated`, used by
sync_content.py. Every page gets both.

`created`, best first (the rung is recorded as `created_source:`):

  1. `front-matter`  explicit `created:` (or legacy `date:`)
  2. `path`          YYYYMMDD / YYYY-MM-DD in the stem, or .../YYYY/MM/DD/
  3. `git`           first commit touching the file
  4. `mtime`         birth time where the OS reports one, else mtime
  5. `build`         this build

`updated`: explicit `updated:` (or `lastmod:`) -> last commit -> mtime -> build.

A shallow clone collapses rung 3 to one timestamp; sync warns. Use
`fetch-depth: 0` in CI.
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
# A date in the path: `blog/2023/12/17/post.md`.
PATH_DATE_RE = re.compile(r"(?:^|/)(\d{4})/(\d{2})/(\d{2})/")

# Marks commit headers in `git log` output; a file could be named like a date.
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
    ({rel: (first, last commit ISO time)}, is_shallow) in one `git log` pass.
    ({}, False) without Git or a work tree. Renames not followed: a renamed
    file is "created" by the rename.
    """
    try:
        # `git log` paths are repo-root relative; the root may sit above `src`.
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


# Unparseable sorts last: an odd `created:` is Hugo's to report, not sync's to abort on.
UNDATED = datetime.min.replace(tzinfo=timezone.utc)


def sort_key(iso: str) -> datetime:
    """Comparable value for any rung's output. A date-only rung means midnight local."""
    try:
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return UNDATED
    return dt if dt.tzinfo else dt.astimezone()
