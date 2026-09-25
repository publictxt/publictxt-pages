#!/usr/bin/env python3
"""
sync_content.py — copy a PublicTxt/Obsidian repo into Hugo's content dir,
fixing what Hugo can't handle natively. Never modifies the source; wipes dest.

  * `index.md`/`home.md` -> `_index.md` (else Hugo reads the folder as a leaf
    bundle and hides its siblings); links to them rewritten to match.
  * No `title:` -> the leading `# H1` (removed from the body), else filename.
  * No `created:`/`updated:` -> dates.py ladders; `date:`/`lastmod:` renamed.
    Section indexes take their newest descendant's `updated`.
  * Folder with Markdown but no index -> generated `_index.md`.
  * Post folder (one non-index .md + attachments, no subfolders) -> its .md
    becomes `index.md`: a leaf bundle, one page.
  * `#hashtags` linkified (hashtags.py).
  * `source_path:` records the pre-rename path, for the edit link.
  * Warns on a page under `bookmarks/` (not `bookmarks/wiki/`) with no
    `bookmark:` URL — only that key makes a bookmark.

Skipped: housekeeping (SKIP_DIRS, SKIP_FILES, *.gitkeep) and `publish: off`
pages, with an unpublished post folder's attachments. Other files are copied
verbatim.

Usage: python3 scripts/sync_content.py <source_repo> <dest_content_dir>
"""

import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

from dates import DateResolver, sort_key
from hashtags import linkify

SKIP_DIRS = {".git", ".obsidian", ".trash", "_site", "node_modules"}
SKIP_FILES = {"README.md", "LICENSE", "LICENSE.md", "CONTRIBUTING.md", "CNAME", ".gitignore"}
INDEX_NAMES = {"index.md", "home.md"}
# `publish:` values that keep a page off the site (YAML reads off/no as false).
UNPUBLISHED = {"off", "false", "no", "0"}
BOOKMARK_KEYS = ("bookmark", "bookmarks")

FRONT_MATTER_RE = re.compile(r"^---\r?\n(.*?)^---\r?\n?", re.DOTALL | re.MULTILINE)
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
INDEX_LINK_RE = re.compile(r"(\]\([^)\s]*?)(?:index|home)\.md(#[^)]*)?\)")
UPDATED_LINE_RE = re.compile(r"^updated: .*$", re.MULTILINE)
# Legacy keys, renamed in the copy.
LEGACY_KEYS = {"date": "created", "lastmod": "updated"}


@dataclass
class Stamp:
    created: str
    created_source: str
    updated: str
    updated_authored: bool   # explicit in front matter: never overridden by children


def split_front_matter(text: str) -> tuple[str | None, str]:
    m = FRONT_MATTER_RE.match(text)
    if not m:
        return None, text
    return m.group(1), text[m.end():]


def has_key(fm: str | None, key: str) -> bool:
    return bool(fm) and re.search(rf"^{key}\s*:", fm, re.MULTILINE) is not None


def front_matter_value(fm: str | None, key: str) -> str:
    """The raw scalar value of `key` in the front matter (quotes stripped), or ""."""
    m = re.search(rf"^{key}\s*:\s*(.+?)\s*$", fm or "", re.MULTILINE)
    return m.group(1).strip("\"'") if m else ""


def is_unpublished(text: str) -> bool:
    fm, _ = split_front_matter(text)
    return front_matter_value(fm, "publish").lower() in UNPUBLISHED


def lacks_bookmark_url(rel: str, fm: str | None, is_index: bool) -> bool:
    """A bookmark page, by location, missing the key that actually makes it one."""
    if is_index or not rel.startswith("bookmarks/") or rel.startswith("bookmarks/wiki/"):
        return False
    return not any(front_matter_value(fm, k) for k in BOOKMARK_KEYS)


def rename_legacy_keys(fm: str | None) -> str | None:
    if not fm:
        return fm
    for old, new in LEGACY_KEYS.items():
        if not has_key(fm, new):
            fm = re.sub(rf"^{old}(\s*:)", rf"{new}\1", fm, count=1, flags=re.MULTILINE)
    return fm


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


def stamp_for(fm: str | None, path: Path, rel: str, resolver: DateResolver) -> Stamp:
    """Resolve a source file's `created` / `updated`, honouring what its front matter says."""
    fm = rename_legacy_keys(fm)
    if created := front_matter_value(fm, "created"):
        created_source = "front-matter"
    else:
        created, created_source = resolver.created(path, rel)
    if updated := front_matter_value(fm, "updated"):
        authored = True
    else:
        updated, authored = resolver.updated(path, rel), False
        # A file can't have changed before it was written; an authored
        # `created` later than the last commit (a scheduled post) wins.
        if sort_key(updated) < sort_key(created):
            updated = created
    return Stamp(created, created_source, updated, authored)


def normalise_md(text: str, rel: str, stamp: Stamp, is_leaf_bundle: bool = False) -> str:
    fm, body = split_front_matter(text)
    fm = rename_legacy_keys(fm)
    name = Path(rel).name
    stem = Path(rel).stem
    added = []

    if not has_key(fm, "title"):
        fallback = stem.replace("-", " ").replace("_", " ").strip()
        if name in INDEX_NAMES or is_leaf_bundle:
            parent = Path(rel).parent.name
            fallback = parent.replace("-", " ") if parent and parent != "." else fallback
        title, body = derive_title(body, fallback)
        added.append(f"title: {yaml_str(title)}")

    if not has_key(fm, "created"):
        added.append(f"created: {stamp.created}")
    if not has_key(fm, "created_source"):
        added.append(f"created_source: {stamp.created_source}")
    if not has_key(fm, "updated"):
        added.append(f"updated: {stamp.updated}")
    if not has_key(fm, "source_path"):
        added.append(f"source_path: {yaml_str(rel)}")

    body = INDEX_LINK_RE.sub(r"\1_index.md\2)", body)
    body = linkify(body)

    fm_lines = [l for l in (fm or "").split("\n") if l.strip()] + added
    return "---\n" + "\n".join(fm_lines) + "\n---\n" + body


def find_leaf_bundle_dirs(src: Path) -> set[Path]:
    """Post folders: one non-index .md + attachments, no subfolders. By structure, not name."""
    bundles = set()
    for d in src.rglob("*"):
        if not d.is_dir() or any(part in SKIP_DIRS for part in d.relative_to(src).parts):
            continue
        children = [c for c in d.iterdir()
                    if c.name not in SKIP_DIRS and c.name not in SKIP_FILES
                    and not c.name.endswith(".gitkeep")]
        if any(c.is_dir() for c in children):
            continue
        md = [c for c in children if c.suffix.lower() == ".md"]
        other = [c for c in children if c.suffix.lower() != ".md"]
        if len(md) == 1 and md[0].name not in INDEX_NAMES and other:
            bundles.add(d)
    return bundles


def sync(src: Path, dest: Path) -> tuple[int, int, int]:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    resolver = DateResolver(src)
    if resolver.shallow_clone:
        print("warning: source repo is a shallow clone — every tracked file reports the "
              "same commit time. Check out with fetch-depth: 0 for real dates.",
              file=sys.stderr)

    leaf_bundles = find_leaf_bundle_dirs(src)
    # A post folder is one page: unpublishing it takes its attachments too.
    hidden_bundles = {d for d in leaf_bundles
                      if any(is_unpublished(md.read_text(encoding="utf-8")) for md in d.glob("*.md"))}
    leaf_bundles -= hidden_bundles

    md_count = other_count = unpublished = 0
    pages: dict[Path, Stamp] = {}     # regular page -> stamp, for index inheritance
    indexes: dict[Path, Stamp] = {}   # existing section index -> stamp

    for path in sorted(src.rglob("*")):
        if any(part in SKIP_DIRS for part in path.relative_to(src).parts):
            continue
        if path.is_dir():
            continue
        if path.name in SKIP_FILES or path.name.endswith(".gitkeep"):
            continue
        if path.parent in hidden_bundles:
            unpublished += path.suffix.lower() == ".md"
            continue

        rel = path.relative_to(src).as_posix()
        target = dest / rel

        if path.suffix.lower() == ".md":
            is_index = path.name in INDEX_NAMES
            is_leaf_bundle = path.parent in leaf_bundles
            if is_index:
                target = target.with_name("_index.md")
            elif is_leaf_bundle:
                target = target.with_name("index.md")
            text = path.read_text(encoding="utf-8")
            if is_unpublished(text):
                unpublished += 1
                continue
            fm, _ = split_front_matter(text)
            if lacks_bookmark_url(rel, fm, is_index):
                print(f"warning: {rel} is under bookmarks/ but has no bookmark: URL — "
                      "not listed as a bookmark", file=sys.stderr)
            stamp = stamp_for(fm, path, rel, resolver)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(normalise_md(text, rel, stamp, is_leaf_bundle), encoding="utf-8")
            (indexes if is_index else pages)[target] = stamp
            md_count += 1
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            other_count += 1

    newest = newest_updated_by_folder(dest, pages)
    leaf_bundle_dests = {dest / b.relative_to(src) for b in leaf_bundles}
    md_count += add_missing_indexes(dest, resolver.built_at, newest, leaf_bundle_dests)
    inherit_index_dates(indexes, newest)
    return md_count, other_count, unpublished


def newest_updated_by_folder(dest: Path, pages: dict[Path, Stamp]) -> dict[Path, str]:
    """Newest `updated` per folder, propagated up to every ancestor inside dest."""
    newest: dict[Path, str] = {}
    for page, stamp in pages.items():
        for folder in (page.parent, *page.parent.parents):
            current = newest.get(folder)
            if current is None or sort_key(stamp.updated) > sort_key(current):
                newest[folder] = stamp.updated
            if folder == dest:
                break
    return newest


def inherit_index_dates(indexes: dict[Path, Stamp], newest: dict[Path, str]) -> None:
    """Move each index's inferred `updated` up to its newest descendant's; authored ones stay."""
    for index, stamp in indexes.items():
        latest = newest.get(index.parent)
        if stamp.updated_authored or latest is None:
            continue
        if sort_key(latest) <= sort_key(stamp.updated):
            continue
        text = index.read_text(encoding="utf-8")
        patched, n = UPDATED_LINE_RE.subn(f"updated: {latest}", text, count=1)
        if n:
            index.write_text(patched, encoding="utf-8")


def add_missing_indexes(
    dest: Path, built_at: str, newest: dict[Path, str], leaf_bundle_dests: set[Path]
) -> int:
    """
    An `_index.md` for every folder with Markdown below it and none of its own —
    Hugo needs one for a section. Dated by its newest page. Leaf bundles excluded.
    """
    created = 0
    for d in sorted(p for p in dest.rglob("*") if p.is_dir()):
        if d in leaf_bundle_dests or (d / "_index.md").exists() or not any(p.is_file() for p in d.rglob("*.md")):
            continue
        title = d.name.replace("-", " ").replace("_", " ").strip()
        updated = newest.get(d, built_at)
        (d / "_index.md").write_text(
            f"---\ntitle: {yaml_str(title)}\ncreated: {updated}\n"
            f"created_source: children\nupdated: {updated}\n---\n",
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
    md, other, unpublished = sync(src, dest)
    print(f"synced {md} markdown file(s) and {other} other file(s) -> {dest}"
          + (f"; {unpublished} unpublished page(s) left out" if unpublished else ""))


if __name__ == "__main__":
    main()
