#!/usr/bin/env python3
"""
sync_content.py — copy a PublicTxt/Obsidian repo into Hugo's content dir,
fixing what Hugo can't handle natively. Never modifies the source; wipes dest.

  * A folder's index is `_index.md`, Hugo's name, passed through as written.
  * No `title:` -> the leading `# H1` (removed from the body), else filename.
  * No `created:`/`updated:` -> dates.py ladders; `date:`/`lastmod:` renamed.
    Section indexes take their newest descendant's `updated`.
  * Folder with Markdown but no index -> generated `_index.md`.
  * `#hashtags` linkified and merged into `tags:` (hashtags.py).
  * `source_path:` records the source path, for the edit link.
  * Warns on a page under `bookmarks/` (not `bookmarks/wiki/`) with no
    `bookmark:` URL — only that key makes a bookmark.

Skipped: housekeeping (SKIP_DIRS, SKIP_FILES, *.gitkeep), the folders listed in
the repo's settings/site.toml `params.excludeFolders` (whole subtrees, notes and
attachments alike — e.g. Obsidian/Templates), and `publish: off`
pages — and every file of a folder whose Markdown is all unpublished (a
draft's attachments; beside published notes, they stay). Other files are copied
verbatim — except SITE_CONFIG, the repo's site settings: not content, it goes
beside dest as `site.toml`, which build.py overlays on hugo.toml.

Usage: python3 scripts/sync_content.py <source_repo> <dest_content_dir>
"""

import re
import shutil
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path

from dates import DateResolver, sort_key
from hashtags import linkify, merge_tags

SKIP_DIRS = {".git", ".obsidian", ".trash", "_site", "node_modules"}
SKIP_FILES = {"README.md", "LICENSE", "LICENSE.md", "CONTRIBUTING.md", "CNAME", ".gitignore"}
INDEX_NAMES = {"_index.md"}
SITE_CONFIG = "settings/site.toml"   # in the source repo; -> <dest>/../site.toml
# `publish:` values that keep a page off the site (YAML reads off/no as false).
UNPUBLISHED = {"off", "false", "no", "0"}
BOOKMARK_KEYS = ("bookmark", "bookmarks")

# Fences may carry trailing spaces (`--- `), as editors leave them.
FRONT_MATTER_RE = re.compile(r"^---[ \t]*\r?\n(.*?)^---[ \t]*\r?\n?", re.DOTALL | re.MULTILINE)
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
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


def normalise_md(text: str, rel: str, stamp: Stamp) -> str:
    fm, body = split_front_matter(text)
    fm = rename_legacy_keys(fm)
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

    if not has_key(fm, "created"):
        added.append(f"created: {stamp.created}")
    if not has_key(fm, "created_source"):
        added.append(f"created_source: {stamp.created_source}")
    if not has_key(fm, "updated"):
        added.append(f"updated: {stamp.updated}")
    if not has_key(fm, "source_path"):
        added.append(f"source_path: {yaml_str(rel)}")

    body = linkify(body)

    fm_lines = [l for l in (fm or "").split("\n") if l.strip()] + added
    fm_lines = merge_tags(fm_lines, body)
    return "---\n" + "\n".join(fm_lines) + "\n---\n" + body


def excluded_folders(src: Path) -> list[tuple[str, ...]]:
    """`params.excludeFolders` from the repo's site settings, as case-folded path parts.

    Paths are from the repo root, `/`-separated; a leading or trailing slash is fine.
    """
    config = src / SITE_CONFIG
    if not config.is_file():
        return []
    with config.open("rb") as f:
        value = tomllib.load(f).get("params", {}).get("excludeFolders", [])
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise SystemExit(f"error: {SITE_CONFIG}: params.excludeFolders must be a list of folder paths")
    return [tuple(p.casefold() for p in v.replace("\\", "/").strip("/").split("/") if p)
            for v in value if v.strip("/ ")]


def is_excluded(rel: Path, excluded: list[tuple[str, ...]]) -> bool:
    """`rel` (a path from the repo root) is inside an excluded folder. Case-insensitive,
    like the Windows and macOS file systems Obsidian vaults live on."""
    parts = tuple(p.casefold() for p in rel.parts[:-1])
    return any(parts[:len(e)] == e for e in excluded)


def hidden_folders(src: Path, excluded: list[tuple[str, ...]] = ()) -> set[Path]:
    """Folders with Markdown below them, none of it published: their other files stay off too."""
    has_md, published = set(), set()
    for md in src.rglob("*.md"):
        rel = md.relative_to(src)
        if (not md.is_file() or md.name in SKIP_FILES or any(p in SKIP_DIRS for p in rel.parts)
                or is_excluded(rel, excluded)):
            continue
        folders = list(md.parents)[:len(rel.parts) - 1]   # up to, not including, src
        has_md.update(folders)
        if not is_unpublished(md.read_text(encoding="utf-8")):
            published.update(folders)
    return has_md - published


def sync(src: Path, dest: Path, resolver: DateResolver | None = None) -> tuple[int, int, int]:
    """`resolver`: a test's fixed dates; default reads this repo's Git history."""
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    config = dest.parent / "site.toml"
    config.unlink(missing_ok=True)
    if (src / SITE_CONFIG).is_file():
        shutil.copy2(src / SITE_CONFIG, config)
        print(f"site settings: {SITE_CONFIG} -> {config}")

    resolver = resolver or DateResolver(src)
    if resolver.shallow_clone:
        print("warning: source repo is a shallow clone — every tracked file reports the "
              "same commit time. Check out with fetch-depth: 0 for real dates.",
              file=sys.stderr)

    excluded = excluded_folders(src)
    hidden = hidden_folders(src, excluded)

    md_count = other_count = unpublished = 0
    pages: dict[Path, Stamp] = {}     # regular page -> stamp, for index inheritance
    indexes: dict[Path, Stamp] = {}   # existing section index -> stamp

    for path in sorted(src.rglob("*")):
        if any(part in SKIP_DIRS for part in path.relative_to(src).parts):
            continue
        if path.is_dir():
            continue
        if is_excluded(path.relative_to(src), excluded):
            continue
        if path.name in SKIP_FILES or path.name.endswith(".gitkeep"):
            continue
        if path.relative_to(src).as_posix() == SITE_CONFIG:
            continue
        if path.suffix.lower() != ".md" and hidden.intersection(path.parents):
            continue

        rel = path.relative_to(src).as_posix()
        target = dest / rel

        if path.suffix.lower() == ".md":
            is_index = path.name in INDEX_NAMES
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
            target.write_text(normalise_md(text, rel, stamp), encoding="utf-8")
            (indexes if is_index else pages)[target] = stamp
            md_count += 1
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            other_count += 1

    newest = newest_updated_by_folder(dest, pages)
    md_count += add_missing_indexes(dest, resolver.built_at, newest)
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


def add_missing_indexes(dest: Path, built_at: str, newest: dict[Path, str]) -> int:
    """
    An `_index.md` for every folder with Markdown below it and none of its own —
    Hugo needs one for a section. Dated by its newest page.
    """
    created = 0
    for d in sorted(p for p in dest.rglob("*") if p.is_dir()):
        if (d / "_index.md").exists() or not any(p.is_file() for p in d.rglob("*.md")):
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
