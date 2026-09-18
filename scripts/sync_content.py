#!/usr/bin/env python3
"""
sync_content.py

Copies a PublicTxt/Obsidian Markdown repository into a Hugo content directory,
normalising the few things Hugo cannot handle natively:

  * `index.md` / `home.md` inside a folder  ->  `_index.md`
    (Hugo treats a folder containing `index.md` as a *leaf bundle* and hides
    every sibling page inside it as a resource — fatal for a wiki.)
  * Missing `title:`  ->  taken from the first `# H1` (which is then removed
    from the body so it isn't rendered twice), else from the filename.
  * Missing `date:`  ->  every page gets one, via the ladder in dates.py
    (filename/path -> last Git commit -> mtime -> build time). The rung used
    is recorded as `date_source:` so templates can distinguish an authored
    date from an inferred one. Section indexes inherit the newest date among
    their descendants.
  * Link destinations pointing at `index.md` / `home.md` are rewritten to
    `_index.md` so Hugo's embedded link render hook can resolve them.
  * Folders containing Markdown but no index page get a minimal `_index.md`
    (title = folder name) so every folder is a browsable section.
  * Inline `#hashtags` become links to their tag page (see hashtags.py for what
    counts as one — code, links and URL fragments are left alone).

Repo housekeeping files (README, LICENSE, CONTRIBUTING, CNAME, .obsidian,
.git, .trash, *.gitkeep) are skipped. Non-Markdown files (media) are copied
verbatim.

The source directory is never modified. The destination is wiped first —
treat it as a build artefact.

Usage:
    python3 scripts/sync_content.py <source_repo> <dest_content_dir>
"""

import re
import shutil
import sys
from pathlib import Path

from dates import DateResolver, sort_key
from hashtags import linkify

SKIP_DIRS = {".git", ".obsidian", ".trash", "_site", "node_modules"}
SKIP_FILES = {"README.md", "LICENSE", "LICENSE.md", "CONTRIBUTING.md", "CNAME", ".gitignore"}
INDEX_NAMES = {"index.md", "home.md"}

FRONT_MATTER_RE = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
INDEX_LINK_RE = re.compile(r"(\]\([^)\s]*?)(?:index|home)\.md(#[^)]*)?\)")
DATE_VALUE_RE = re.compile(r"^date\s*:\s*(.+?)\s*$", re.MULTILINE)
# Matches only the date block sync itself wrote, and only on an inferred rung —
# an authored date must never be silently overwritten by a folder's activity.
INFERRED_DATE_RE = re.compile(
    r"^date: .*\ndate_source: (?:git|mtime|build)$", re.MULTILINE
)
# Rungs where the date means "written", not "last touched".
AUTHORED_SOURCES = {"front-matter", "path"}


def split_front_matter(text: str) -> tuple[str | None, str]:
    m = FRONT_MATTER_RE.match(text)
    if not m:
        return None, text
    return m.group(1), text[m.end():]


def has_key(fm: str | None, key: str) -> bool:
    return bool(fm) and re.search(rf"^{key}\s*:", fm, re.MULTILINE) is not None


def front_matter_date(fm: str | None) -> str:
    """The raw `date:` value already in the front matter (quotes stripped)."""
    m = DATE_VALUE_RE.search(fm or "")
    return m.group(1).strip("\"'") if m else ""


def derive_title(body: str, fallback: str) -> tuple[str, str]:
    """Return (title, body). Uses and removes the first H1 if it precedes any other content."""
    m = H1_RE.search(body)
    if m:
        before = body[:m.start()].strip()
        # Only treat the H1 as the page title if nothing but whitespace/links precedes it
        if not before or len(before) < 200 and "\n" not in before.strip():
            title = m.group(1).strip("# ").strip()
            body = body[:m.start()] + body[m.end():]
            return title, body.lstrip("\n")
    return fallback, body


def yaml_str(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'




def normalise_md(text: str, rel: str, date: str, date_source: str,
                 git_time: str | None) -> str:
    fm, body = split_front_matter(text)
    name = Path(rel).name
    stem = Path(rel).stem
    added = []

    if not has_key(fm, "title"):
        fallback = stem.replace("-", " ").replace("_", " ").strip()
        if name in INDEX_NAMES:
            parent = Path(rel).parent.name
            fallback = parent.replace("-", " ") if parent and parent != "." else fallback
        title, body = derive_title(body, fallback)
        added.append(f"title: {yaml_str(title)}")

    if not has_key(fm, "date"):
        added.append(f"date: {date}")
    if not has_key(fm, "date_source"):
        added.append(f"date_source: {date_source}")

    # An authored date says when a page was written; for a page that has since
    # been edited, `lastmod` is what makes "recent" mean recently *changed*.
    # The inferred rungs are already modification times, so this only applies
    # to the two authored ones.
    if date_source in AUTHORED_SOURCES and git_time and not has_key(fm, "lastmod"):
        if sort_key(git_time) > sort_key(date):
            added.append(f"lastmod: {git_time}")

    body = INDEX_LINK_RE.sub(r"\1_index.md\2)", body)
    body = linkify(body)

    fm_lines = [l for l in (fm or "").split("\n") if l.strip()] + added
    return "---\n" + "\n".join(fm_lines) + "\n---\n" + body


def sync(src: Path, dest: Path) -> tuple[int, int]:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    resolver = DateResolver(src)
    if resolver.shallow_clone:
        print("warning: source repo is a shallow clone — every tracked file reports the "
              "same commit time. Check out with fetch-depth: 0 for real dates.",
              file=sys.stderr)

    md_count = other_count = 0
    page_dates: dict[Path, str] = {}  # regular page -> resolved date, for index inheritance

    for path in sorted(src.rglob("*")):
        if any(part in SKIP_DIRS for part in path.relative_to(src).parts):
            continue
        if path.is_dir():
            continue
        if path.name in SKIP_FILES or path.name.endswith(".gitkeep"):
            continue

        rel = path.relative_to(src).as_posix()
        target = dest / rel

        if path.suffix.lower() == ".md":
            is_index = path.name in INDEX_NAMES
            if is_index:
                target = target.with_name("_index.md")
            text = path.read_text(encoding="utf-8")
            fm, _ = split_front_matter(text)
            if has_key(fm, "date"):
                date, date_source = front_matter_date(fm), "front-matter"
            else:
                date, date_source = resolver.resolve(path, rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(
                normalise_md(text, rel, date, date_source, resolver.git_time(rel)),
                encoding="utf-8",
            )
            if not is_index:
                page_dates[target] = date
            md_count += 1
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            other_count += 1

    md_count += add_missing_indexes(dest, resolver.built_at)
    apply_index_dates(dest, page_dates)
    return md_count, other_count


def newest_by_folder(dest: Path, page_dates: dict[Path, str]) -> dict[Path, str]:
    """Newest page date per folder, propagated up to every ancestor inside dest."""
    newest: dict[Path, str] = {}
    for page, date in page_dates.items():
        for folder in (page.parent, *page.parent.parents):
            current = newest.get(folder)
            if current is None or sort_key(date) > sort_key(current):
                newest[folder] = date
            if folder == dest:
                break
    return newest


def apply_index_dates(dest: Path, page_dates: dict[Path, str]) -> None:
    """
    Re-date every section index whose date was merely inferred to the newest
    date among its descendants. A section is recent when its contents are —
    the landing page's own mtime says nothing useful about that.

    Authored dates (`front-matter`, `path`) are left alone, as is any index
    with no descendant pages.
    """
    newest = newest_by_folder(dest, page_dates)
    for index in dest.rglob("_index.md"):
        date = newest.get(index.parent)
        if date is None:
            continue
        text = index.read_text(encoding="utf-8")
        patched, n = INFERRED_DATE_RE.subn(
            f"date: {date}\ndate_source: children", text, count=1
        )
        if n:
            index.write_text(patched, encoding="utf-8")


def add_missing_indexes(dest: Path, built_at: str) -> int:
    """
    Give every folder that contains Markdown (at any depth) an `_index.md` if it
    has none. Hugo only treats a folder as a section — browsable, and present in
    breadcrumbs — when it has one; nested wiki folders usually don't.

    The date written here is a placeholder: apply_index_dates replaces it with
    the newest date among the folder's pages.
    """
    created = 0
    for d in sorted(p for p in dest.rglob("*") if p.is_dir()):
        if (d / "_index.md").exists() or not any(d.rglob("*.md")):
            continue
        title = d.name.replace("-", " ").replace("_", " ").strip()
        (d / "_index.md").write_text(
            f"---\ntitle: {yaml_str(title)}\ndate: {built_at}\ndate_source: build\n---\n",
            encoding="utf-8",
        )
        created += 1
    return created


def main():
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    src, dest = Path(sys.argv[1]), Path(sys.argv[2])
    if not src.is_dir():
        print(f"error: {src} is not a directory", file=sys.stderr)
        sys.exit(1)
    if src.resolve() == dest.resolve() or dest.resolve() in src.resolve().parents:
        print("error: destination must not be the source or a parent of it", file=sys.stderr)
        sys.exit(1)
    md, other = sync(src, dest)
    print(f"synced {md} markdown file(s) and {other} other file(s) -> {dest}")


if __name__ == "__main__":
    main()
