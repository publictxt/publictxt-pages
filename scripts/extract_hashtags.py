#!/usr/bin/env python3
"""
extract_hashtags.py

Preprocessing step for PublicTxt-Hugo (see SPEC.md).

Scans Markdown files under content/, extracts inline #hashtags from the
body, and merges them into the front matter `tags` list. Body text is left
untouched — hashtags remain visible for Obsidian-style reading. Hashtags
inside fenced code blocks (```) and inline code spans (`...`) are ignored.

No third-party dependencies (PyYAML etc. deliberately avoided — front
matter here is a controlled, simple subset of YAML: scalar `key: value`
pairs and one-line `key: [a, b, c]` lists). If front matter grows more
complex than that, swap in a real YAML parser rather than extending the
hand-rolled one below.

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


def parse_front_matter(fm_text: str) -> tuple[dict, list[str]]:
    """
    Minimal front matter parser. Returns (fields, original_lines).
    fields: dict of key -> raw string value (list values kept as a Python list of str)
    original_lines: the raw lines, for reconstruction preserving key order/formatting
    """
    fields = {}
    lines = fm_text.split("\n")
    for line in lines:
        if not line.strip() or line.strip().startswith("#"):
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", line)
        if not m:
            continue
        key, value = m.group(1), m.group(2).strip()
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            items = []
            if inner:
                for item in inner.split(","):
                    item = item.strip().strip('"').strip("'")
                    if item:
                        items.append(item)
            fields[key] = items
        else:
            fields[key] = value.strip('"').strip("'")
    return fields, lines


def render_tags_line(tags: list[str]) -> str:
    quoted = ", ".join(f'"{t}"' for t in tags)
    return f"tags: [{quoted}]"


def process_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    m = FRONT_MATTER_RE.match(text)
    if not m:
        return False  # no front matter — skip (e.g. malformed file)

    fm_text = m.group(1)
    body = text[m.end():]

    fields, lines = parse_front_matter(fm_text)
    existing_tags = fields.get("tags", [])
    if isinstance(existing_tags, str):
        existing_tags = [existing_tags]

    inline_tags = extract_hashtags(body)
    merged = list(dict.fromkeys([*existing_tags, *inline_tags]))  # de-dupe, preserve order

    if merged == existing_tags:
        return False  # nothing changed

    new_lines = []
    replaced = False
    for line in lines:
        if re.match(r"^tags:\s*", line):
            new_lines.append(render_tags_line(merged))
            replaced = True
        else:
            new_lines.append(line)
    if not replaced:
        new_lines.append(render_tags_line(merged))

    new_fm = "\n".join(new_lines)
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
