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
  * Missing `created:` / `updated:`  ->  every page gets both, via the ladders
    in dates.py (filename/path -> Git history -> file times -> build time).
    The rung `created` came from is recorded as `created_source:`. Section
    indexes take the newest `updated` among their descendants. The legacy
    keys `date:` and `lastmod:` are accepted and renamed in the copy.
  * Link destinations pointing at `index.md` / `home.md` are rewritten to
    `_index.md` so Hugo's embedded link render hook can resolve them.
  * Folders containing Markdown but no index page get a minimal `_index.md`
    (title = folder name) so every folder is a browsable section.
  * A folder holding exactly one non-index Markdown file plus attachments, and
    no subfolders, is a **post folder** (e.g. `Post-Name/title.md` +
    `image.png`): the Markdown is renamed to `index.md` (lowercase, no
    underscore) so Hugo reads the folder as a *leaf bundle* — one page, with
    the attachments as its page resources — instead of getting an auto
    section index.
  * Inline `#hashtags` become links to their tag page (see hashtags.py for what
    counts as one — code, links and URL fragments are left alone).
  * Every copied page records its path in the source repo as `source_path:`,
    since the renames above make Hugo's own file path unreliable for that. The
    "Edit this page" link (layouts/_partials/footer.html) is built from it;
    generated indexes have no source file, so no key and no link.

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
from dataclasses import dataclass
from pathlib import Path

from dates import DateResolver, sort_key
from hashtags import linkify

SKIP_DIRS = {".git", ".obsidian", ".trash", "_site", "node_modules"}
SKIP_FILES = {"README.md", "LICENSE", "LICENSE.md", "CONTRIBUTING.md", "CNAME", ".gitignore"}
INDEX_NAMES = {"index.md", "home.md"}

FRONT_MATTER_RE = re.compile(r"^---\r?\n(.*?)^---\r?\n?", re.DOTALL | re.MULTILINE)
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
INDEX_LINK_RE = re.compile(r"(\]\([^)\s]*?)(?:index|home)\.md(#[^)]*)?\)")
UPDATED_LINE_RE = re.compile(r"^updated: .*$", re.MULTILINE)
# Legacy front matter keys, renamed in the generated copy so build/content
# speaks one vocabulary. The source file is untouched.
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
    """
    Source folders that are a Hugo leaf bundle in disguise: one non-index
    Markdown post plus its attachments, no subfolders (spec: `title.md` +
    `image.png` in one folder). Detected structurally, not by filename —
    `index.md`/`home.md` keep meaning "section index".
    """
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


def sync(src: Path, dest: Path) -> tuple[int, int]:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    resolver = DateResolver(src)
    if resolver.shallow_clone:
        print("warning: source repo is a shallow clone — every tracked file reports the "
              "same commit time. Check out with fetch-depth: 0 for real dates.",
              file=sys.stderr)

    leaf_bundles = find_leaf_bundle_dirs(src)

    md_count = other_count = 0
    pages: dict[Path, Stamp] = {}     # regular page -> stamp, for index inheritance
    indexes: dict[Path, Stamp] = {}   # existing section index -> stamp

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
            is_leaf_bundle = path.parent in leaf_bundles
            if is_index:
                target = target.with_name("_index.md")
            elif is_leaf_bundle:
                target = target.with_name("index.md")
            text = path.read_text(encoding="utf-8")
            fm, _ = split_front_matter(text)
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
    return md_count, other_count


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
    """
    Push every section index's inferred `updated` forward to the newest
    `updated` among its descendants. A section is recent when its contents
    are — the landing page's own history alone says nothing useful about that.

    An authored `updated:` is left alone, as is any index with no descendant
    pages or one that was itself touched more recently than its contents.
    """
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
    Give every folder that contains Markdown (at any depth) an `_index.md` if it
    has none. Hugo only treats a folder as a section — browsable, and present in
    breadcrumbs — when it has one; nested wiki folders usually don't.

    A generated index has no history of its own, so it is dated by its
    contents: `updated` is the newest among the folder's pages.

    Leaf bundles (post folders, see `find_leaf_bundle_dirs`) are skipped: they
    are meant to be a single page, not a section wrapping one.
    """
    created = 0
    for d in sorted(p for p in dest.rglob("*") if p.is_dir()):
        if d in leaf_bundle_dests or (d / "_index.md").exists() or not any(d.rglob("*.md")):
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
    md, other = sync(src, dest)
    print(f"synced {md} markdown file(s) and {other} other file(s) -> {dest}")


if __name__ == "__main__":
    main()
