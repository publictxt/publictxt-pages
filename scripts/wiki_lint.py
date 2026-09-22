#!/usr/bin/env python3
"""
wiki_lint.py

Health check for docs/wiki/ — the source wiki an LLM reads instead of the source
(see docs/wiki/index.md). A stale code wiki is worse than none, because it answers
confidently and wrongly, so every page declares what it covers and this checks the
claim.

Each page's front matter lists real repo paths:

    ---
    covers:
      - scripts/sync_content.py
      - layouts/_partials/recent.html
    ---

A **file** entry means "this page describes what is in that file": the page is
STALE when the file changed more recently than the page did. A **directory**
entry means "this page describes the set of files here" — an index or overview —
so it goes stale only when a file under it is added, deleted or renamed, not on
every edit.

Reports:
  STALE    a covered path changed after its page last did
  MISSING  a `covers:` path that no longer exists
  BARE     a wiki page with no `covers:` front matter — nothing can check it
  UNMAPPED a source file the map in docs/wiki/index.md does not mention. The map's
           whole job is to say where everything is, so a file missing from it is
           a file nobody can be routed to.

Uncommitted changes count as "now", so the lint is useful *before* committing:
edit code, run it, see which page to update in the same commit.

Usage:
    python scripts/wiki_lint.py [--wiki docs/wiki] [--quiet]

Exits 1 when anything is reported, 0 when clean.
"""

import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from dates import git_commit_times, sort_key

# Source files the map is expected to account for (the UNMAPPED check).
SOURCE_GLOBS = (
    "scripts/*.py", "scripts/*.sh", "scripts/*.ps1",
    "layouts/**/*.html",
    "assets/**/*.js", "assets/**/*.css",
    "deploy/*.yml",
    "hugo.toml",
)
# The linter is described in the map's prose rather than listed as a path.
SOURCE_EXCLUDE = {"scripts/wiki_lint.py"}
# The page whose map must mention every source file.
MAP_PAGE = "index.md"

# Separates entries in `git status -z` output.
NUL = chr(0)

FRONT_MATTER_RE = re.compile(r"^---\r?\n(.*?)\r?\n---", re.DOTALL)
COVERS_RE = re.compile(r"^covers:\s*$(.*?)(?=^\S|\Z)", re.MULTILINE | re.DOTALL)
ITEM_RE = re.compile(r"^\s+-\s*(.+?)\s*$", re.MULTILINE)


def covers(page: Path) -> list[str] | None:
    """The paths a page claims to describe, or None when it declares nothing."""
    m = FRONT_MATTER_RE.match(page.read_text(encoding="utf-8"))
    if not m:
        return None
    c = COVERS_RE.search(m.group(1) + "\n")
    if not c:
        return None
    return [i.strip().strip("\"'") for i in ITEM_RE.findall(c.group(1))]


def dirty_paths(root: Path) -> set[str]:
    """Paths with uncommitted changes — treated as changed just now."""
    try:
        out = subprocess.run(
            ["git", "-C", str(root), "status", "--porcelain", "-z"],
            capture_output=True, text=True, check=True, encoding="utf-8",
        ).stdout
    except (OSError, subprocess.CalledProcessError):
        return set()
    paths = set()
    entries = iter(out.split(NUL))
    for entry in entries:
        if len(entry) <= 3:
            continue
        status, path = entry[:2], entry[3:]
        paths.add(path)
        # A rename or copy is two entries: the new path, then the old one bare.
        # Consume the second so it is not read as another status line.
        if "R" in status or "C" in status:
            next(entries, None)
    return paths


def structure_changed(root: Path, d: str) -> str | None:
    """Last commit that added, deleted or renamed a file under `d`."""
    try:
        out = subprocess.run(
            ["git", "-C", str(root), "log", "-1", "--format=%cI",
             "--diff-filter=ADR", "--", d],
            capture_output=True, text=True, check=True, encoding="utf-8",
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None
    return out or None


NOW = datetime.now().astimezone().isoformat()


class Times:
    """When each path last changed, committed or not."""

    def __init__(self, root: Path):
        self.root = root
        self.commits, _ = git_commit_times(root)
        self.dirty = dirty_paths(root)

    def of(self, rel: str) -> str | None:
        if rel in self.dirty:
            return NOW
        return (self.commits.get(rel) or (None, None))[1]


def day(iso: str) -> str:
    return (iso or "")[:10] or "?"


def check_page(root: Path, times: Times, page: Path) -> list[str]:
    """Problems with one wiki page."""
    rel_page = page.relative_to(root).as_posix()
    declared = covers(page)
    if declared is None:
        # Decision records describe reasoning rather than files.
        if "decisions/" in rel_page:
            return []
        return [f"BARE    {rel_page} - no covers: front matter"]

    page_t = times.of(rel_page)
    problems = []
    for c in declared:
        target = root / c
        if not target.exists():
            problems.append(f"MISSING {rel_page} - covers: {c}, which does not exist")
            continue

        if target.is_dir():
            what = f"{c}/ (files added or removed)"
            changed = NOW if c in times.dirty else structure_changed(root, c)
        else:
            what, changed = c, times.of(c)

        if changed and page_t and sort_key(changed) > sort_key(page_t):
            problems.append(
                f"STALE   {rel_page}\n"
                f"          {what} changed {day(changed)}, "
                f"page last updated {day(page_t)}"
            )
    return problems


def main() -> int:
    args = sys.argv[1:]
    quiet = "--quiet" in args
    root = Path(__file__).resolve().parent.parent
    wiki = Path(args[args.index("--wiki") + 1]).resolve() if "--wiki" in args else root / "docs" / "wiki"

    if not wiki.is_dir():
        print(f"error: {wiki} is not a directory", file=sys.stderr)
        return 2

    times = Times(root)
    pages = sorted(wiki.rglob("*.md"))
    problems: list[str] = []
    for page in pages:
        problems.extend(check_page(root, times, page))

    # The map must mention every source file, by path or by name — partials are
    # listed under a `layouts/_partials/` heading, so a bare name counts.
    map_text = (wiki / MAP_PAGE).read_text(encoding="utf-8") if (wiki / MAP_PAGE).exists() else ""
    unmapped = set()
    for pattern in SOURCE_GLOBS:
        for f in root.glob(pattern):
            rel = f.relative_to(root).as_posix()
            if rel in SOURCE_EXCLUDE:
                continue
            if rel not in map_text and f.name not in map_text:
                unmapped.add(rel)
    problems += [f"UNMAPPED {rel} - not listed in {MAP_PAGE}" for rel in sorted(unmapped)]

    if not quiet:
        for p in problems:
            print(p)
    counts = {k: sum(p.startswith(k) for p in problems) for k in ("STALE", "MISSING", "BARE", "UNMAPPED")}
    print(f"{len(pages)} page(s) checked | {counts['STALE']} stale | {counts['MISSING']} missing "
          f"| {counts['BARE']} bare | {counts['UNMAPPED']} unmapped")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
