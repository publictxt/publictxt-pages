#!/usr/bin/env python3
"""
extract_hashtags.py — merge each page's inline #hashtags (hashtags.py) into
its front matter `tags`. Body untouched. Idempotent.

Not a YAML parser: only `tags` is read (inline `[a, b]`, block `- a`, or a
scalar) and rewritten inline; other lines pass through. Needing more means a
real parser, not a bigger regex.

Usage: python3 scripts/extract_hashtags.py [content_dir]
"""

import re
import sys
from pathlib import Path

from hashtags import find_hashtags

FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)


KEY_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$")
BLOCK_ITEM_RE = re.compile(r"^\s+-\s*(.*)$")


def _unquote(s: str) -> str:
    return s.strip().strip('"').strip("'")


def parse_tags(fm_text: str) -> tuple[list[str], tuple[int, int] | None]:
    """(tags, (start, end) line span of the `tags` entry, end exclusive) or (…, None) when absent."""
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

    inline_tags = find_hashtags(body)
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
