#!/usr/bin/env python3
"""
hashtags.py — the one definition of an inline #hashtag, for sync_content.py:
linkify() for the body, merge_tags() for front matter `tags`, so visible tags
and the tag cloud agree.

`#` + a letter, then letters/digits/`_`/`-`; not after a word char, `/` or `&`.
Not inside code, HTML tags, links or URLs (`/page/#section` is no tag). An
already-linkified `[#tag](...)` counts but is never re-linked: both operations
are idempotent.

Merged at sync, not in templates: Hugo builds taxonomies from front matter
before rendering, so inline tags would miss /tags/ pages and the tag cloud.
"""

import re

HASHTAG_RE = re.compile(
    # 1. an already-linkified hashtag — still a tag, but must not be re-linked
    r"(?<!!)\[#(?P<linked>[A-Za-z][A-Za-z0-9_-]*)\]\([^)\n]*\)"
    # 2. regions that never contain tags (order matters: checked before 3)
    r"|(?P<protected>"
    r"!?\[[^\]\n]*\]\([^)\n]*\)"   # inline link or image
    r"|```.*?```"                    # fenced code
    r"|~~~.*?~~~"
    r"|`[^`\n]*`"                    # inline code
    r"|<[^>\n]+>"                    # HTML tag or autolink
    r"|https?://\S+"                 # bare URL
    r")"
    # 3. a bare hashtag in prose
    r"|(?<![\w/&])#(?P<tag>[A-Za-z][A-Za-z0-9_-]*)",
    re.DOTALL,
)


def find_hashtags(body: str) -> list[str]:
    """Tags mentioned in `body`, lowercased, in order of first appearance."""
    seen = []
    for m in HASHTAG_RE.finditer(body):
        tag = m.group("linked") or m.group("tag")
        if tag:
            tag = tag.lower()
            if tag not in seen:
                seen.append(tag)
    return seen


def linkify(body: str) -> str:
    """
    Bare `#tag` -> `[#tag](/tags/tag/)`, text unchanged. Hugo's link render hook
    resolves the path (so sub-path deploys work); the lowercased slug matches
    urlize and find_hashtags().
    """
    def repl(m: re.Match) -> str:
        tag = m.group("tag")
        if not tag:
            return m.group(0)   # protected region, or already a tag link
        return f"[#{tag}](/tags/{tag.lower()}/)"

    return HASHTAG_RE.sub(repl, body)


# Front matter `tags`: not a YAML parser. Only `tags` is read (inline `[a, b]`,
# block `- a`, or a scalar) and rewritten inline; other lines pass through.
# Needing more means a real parser, not a bigger regex.
KEY_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$")
BLOCK_ITEM_RE = re.compile(r"^\s+-\s*(.*)$")


def _unquote(s: str) -> str:
    return s.strip().strip('"').strip("'")


def parse_tags(lines: list[str]) -> tuple[list[str], tuple[int, int] | None]:
    """(tags, (start, end) line span of the `tags` entry, end exclusive), or ([], None) when absent."""
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


def merge_tags(fm_lines: list[str], body: str) -> list[str]:
    """
    Front matter lines with `body`'s hashtags merged into `tags` (existing
    first, deduped). Unchanged — block style kept — when the body adds none;
    else one inline `tags:` line, in place or appended.
    """
    existing, span = parse_tags(fm_lines)
    merged = list(dict.fromkeys([*existing, *find_hashtags(body)]))
    if merged == existing:
        return fm_lines
    line = "tags: [" + ", ".join(f'"{t}"' for t in merged) + "]"
    if span is None:
        return [*fm_lines, line]
    start, end = span
    return [*fm_lines[:start], line, *fm_lines[end:]]
