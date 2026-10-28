#!/usr/bin/env python3
"""
hashtags.py — the one definition of an inline #hashtag, for sync_content.py:
linkify() for the body, merge_tags() for front matter `tags`, so visible tags
and the tag cloud agree.

`#` + a letter, then letters/digits/`_`/`-`, optionally nested by `/`
(`#dev/app`, as Obsidian); not after a word char, `/` or `&`. Not inside code, HTML tags, links or URLs (`/page/#section` is no tag). An
already-linkified `[#tag](...)` counts but is never re-linked: both operations
are idempotent.

Merged at sync, not in templates: Hugo builds taxonomies from front matter
before rendering, so inline tags would miss /tags/ pages and the tag cloud.

Nested tags are flat, separate terms: `dev/app` doesn't include or count under
`dev`. Hugo files a term containing `/` under its parent's path, then misreads
the parent (its page, count, list), so a nested tag is stored under
term_key() — `dev--app` — and sync gives that term page the real name as its
title (term_titles()). Templates and JS show and filter on the title.
"""

import re

TAG = r"[A-Za-z][A-Za-z0-9_-]*(?:/[A-Za-z0-9_-]+)*"
NEST_SEP = "--"   # `/` in a term key; tagURL() in cards.js and the dataview hook repeat it

HASHTAG_RE = re.compile(
    # 1. an already-linkified hashtag — still a tag, but must not be re-linked
    rf"(?<!!)\[#(?P<linked>{TAG})\]\([^)\n]*\)"
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
    rf"|(?<![\w/&])#(?P<tag>{TAG})",
    re.DOTALL,
)


def term_key(tag: str) -> str:
    """The Hugo term a tag is stored under: `/` can't be in it (module docstring)."""
    return tag.replace("/", NEST_SEP)


def tag_path(tag: str) -> str:
    """A tag's /tags/<path>/ segment: Hugo's urlize of term_key(), for our tag charset."""
    return term_key(tag).lower()


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
    resolves the path (so sub-path deploys work); the slug is tag_path().
    """
    def repl(m: re.Match) -> str:
        tag = m.group("tag")
        if not tag:
            return m.group(0)   # protected region, or already a tag link
        return f"[#{tag}](/tags/{tag_path(tag)}/)"

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


def page_tags(fm_lines: list[str], body: str) -> list[str]:
    """A page's tags, as named: front matter's first, then `body`'s hashtags; deduped."""
    raw, _ = parse_tags(fm_lines)
    # Obsidian can store `- #tag`; the site adds its own `#`, which would show `##tag`.
    existing = [t for t in (t.lstrip("#").strip("/") for t in raw) if t]
    return list(dict.fromkeys([*existing, *find_hashtags(body)]))


def term_titles(tags: list[str]) -> dict[str, str]:
    """tag_path -> name for the nested tags: the term pages sync titles."""
    return {tag_path(t): t for t in tags if "/" in t}


def merge_tags(fm_lines: list[str], body: str) -> list[str]:
    """
    Front matter lines with `tags` set to page_tags(), each as its term_key().
    Unchanged — block style kept — when that changes nothing; else one inline
    `tags:` line, in place or appended.
    """
    raw, span = parse_tags(fm_lines)
    merged = list(dict.fromkeys(term_key(t) for t in page_tags(fm_lines, body)))
    if merged == raw:
        return fm_lines
    line = "tags: [" + ", ".join(f'"{t}"' for t in merged) + "]"
    if span is None:
        return [*fm_lines, line]
    start, end = span
    return [*fm_lines[:start], line, *fm_lines[end:]]
