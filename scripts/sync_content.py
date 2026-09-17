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
  * Missing `date:` on blog posts  ->  derived from a `YYYYMMDD` filename
    prefix or a `blog/YYYY/MM/DD/` path.
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

from hashtags import linkify

SKIP_DIRS = {".git", ".obsidian", ".trash", "_site", "node_modules"}
SKIP_FILES = {"README.md", "LICENSE", "LICENSE.md", "CONTRIBUTING.md", "CNAME", ".gitignore"}
INDEX_NAMES = {"index.md", "home.md"}

FRONT_MATTER_RE = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
DATE_PREFIX_RE = re.compile(r"^(\d{4})(\d{2})(\d{2})")
DATE_PATH_RE = re.compile(r"^blog/(\d{4})/(\d{2})/(\d{2})/")
INDEX_LINK_RE = re.compile(r"(\]\([^)\s]*?)(?:index|home)\.md(#[^)]*)?\)")


def split_front_matter(text: str) -> tuple[str | None, str]:
    m = FRONT_MATTER_RE.match(text)
    if not m:
        return None, text
    return m.group(1), text[m.end():]


def has_key(fm: str | None, key: str) -> bool:
    return bool(fm) and re.search(rf"^{key}\s*:", fm, re.MULTILINE) is not None


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


def derive_date(rel: str, name: str) -> str | None:
    m = DATE_PREFIX_RE.match(name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = DATE_PATH_RE.match(rel)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None


def yaml_str(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'




def normalise_md(text: str, rel: str) -> str:
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

    if rel.startswith("blog/") and not has_key(fm, "date"):
        d = derive_date(rel, name)
        if d:
            added.append(f"date: {d}")

    body = INDEX_LINK_RE.sub(r"\1_index.md\2)", body)
    body = linkify(body)

    fm_lines = [l for l in (fm or "").split("\n") if l.strip()] + added
    if not fm_lines:
        return body
    return "---\n" + "\n".join(fm_lines) + "\n---\n" + body


def sync(src: Path, dest: Path) -> tuple[int, int]:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    md_count = other_count = 0
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
            if path.name in INDEX_NAMES:
                target = target.with_name("_index.md")
            text = path.read_text(encoding="utf-8")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(normalise_md(text, rel), encoding="utf-8")
            md_count += 1
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            other_count += 1

    md_count += add_missing_indexes(dest)
    return md_count, other_count


def add_missing_indexes(dest: Path) -> int:
    """
    Give every folder that contains Markdown (at any depth) an `_index.md` if it
    has none. Hugo only treats a folder as a section — browsable, and present in
    breadcrumbs — when it has one; nested wiki folders usually don't.
    """
    created = 0
    for d in sorted(p for p in dest.rglob("*") if p.is_dir()):
        if (d / "_index.md").exists() or not any(d.rglob("*.md")):
            continue
        title = d.name.replace("-", " ").replace("_", " ").strip()
        (d / "_index.md").write_text(f"---\ntitle: {yaml_str(title)}\n---\n", encoding="utf-8")
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
