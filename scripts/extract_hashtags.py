#!/usr/bin/env python3
"""
extract_hashtags.py

Preprocessing step for PublicTxt-Hugo (see SPEC.md).

Scans Markdown files under content/, extracts inline #hashtags from the
body, and merges them into the front matter `tags` list. Body text is left
untouched — hashtags remain visible for Obsidian-style reading. Hashtags
inside fenced code blocks (```) and inline code spans (`...`) are ignored.

No third-party dependencies (PyYAML etc. deliberately avoided). Only the
`tags` entry is interpreted — as an inline `[a, b]` list, a block `- a`
list, or a scalar — and it is rewritten in inline form. Every other front
matter line is passed through untouched. If `tags` ever needs richer YAML
than that, swap in a real parser rather than extending this one.

Usage:
    python3 scripts/extract_hashtags.py [content_dir]

Idempotent: safe to re-run: already-merged tags are de-duplicated, not
re-appended.
"""

import re
import sys
from pathlib import Path

HASHTAG_RE = re.compile(r"(?<!\w)#([A-Za-z][A-Za-z0-9_-]*)")
FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)
FENCE_RE = re.compile(r"```.*?```", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")


def strip_code(body: str) -> str:
    """Remove fenced and inline code spans so hashtags inside code aren't extracted."""
    body = FENCE_RE.sub("", body)
    body = INLINE_CODE_RE.sub("", body)
    return body


def extract_hashtags(body: str) -> list[str]:
    clean = strip_code(body)
    seen = []
    for match in HASHTAG_RE.finditer(clean):
        tag = match.group(1).lower()
        if tag not in seen:
            seen.append(tag)
    return seen


KEY_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$")
BLOCK_ITEM_RE = re.compile(r"^\s+-\s*(.*)$")


def _unquote(s: str) -> str:
    return s.strip().strip('"').strip("'")


def parse_tags(fm_text: str) -> tuple[list[str], tuple[int, int] | None]:
    """
    Find the `tags` entry in front matter. Returns (tags, (start, end)) where
    start/end are the line indices of the entry (end exclusive), or None if
    there is no `tags` key. Supports inline `[a, b]` and block `- a` lists.
    """
    lines = fm_text.split("\n")
    i = 0
    while i < len(lines):
        m = KEY_RE.match(lines[i])
        if not m or m.group(1) != "tags":
            i += 1
            continue
        value = m.group(2).strip()
        start = i
        i += 1
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            tags = [_unquote(x) for x in inner.split(",") if _unquote(x)] if inner else []
            return tags, (start, i)
        if value:
            return [_unquote(value)], (start, i)
        tags = []
        while i < len(lines):
            bm = BLOCK_ITEM_RE.match(lines[i])
            if not bm:
                break
            item = _unquote(bm.group(1))
            if item:
                tags.append(item)
            i += 1
        return tags, (start, i)
    return [], None


def render_tags_line(tags: list[str]) -> str:
    quoted = ", ".join(f'"{t}"' for t in tags)
    return f"tags: [{quoted}]"


def process_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    m = FRONT_MATTER_RE.match(text)
    if m:
        fm_text = m.group(1)
        body = text[m.end():]
    else:
        fm_text = ""  # no front matter yet — one is created if hashtags are found
        body = text

    existing_tags, span = parse_tags(fm_text)

    inline_tags = extract_hashtags(body)
    merged = list(dict.fromkeys([*existing_tags, *inline_tags]))  # de-dupe, preserve order

    if merged == existing_tags:
        return False  # nothing changed

    lines = fm_text.split("\n") if fm_text else []
    if span:
        start, end = span
        new_lines = lines[:start] + [render_tags_line(merged)] + lines[end:]
    else:
        new_lines = lines + [render_tags_line(merged)]

    new_fm = "\n".join(new_lines)
    if not m:
        body = "\n" + body.lstrip("\n")
    new_text = f"---\n{new_fm}\n---\n{body}"
    path.write_text(new_text, encoding="utf-8")
    return True


def main():
    content_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "content")
    if not content_dir.is_dir():
        print(f"error: {content_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    changed = 0
    for path in content_dir.rglob("*.md"):
        if process_file(path):
            changed += 1
            print(f"updated: {path}")

    print(f"done — {changed} file(s) updated")


if __name__ == "__main__":
    main()
