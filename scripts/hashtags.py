#!/usr/bin/env python3
"""
hashtags.py — the one definition of an inline #hashtag, shared by
sync_content.py (linkify) and extract_hashtags.py (front matter `tags`), so
visible tags and the tag cloud agree.

`#` + a letter, then letters/digits/`_`/`-`; not after a word char, `/` or `&`.
Not inside code, HTML tags, links or URLs (`/page/#section` is no tag). An
already-linkified `[#tag](...)` counts but is never re-linked: both operations
are idempotent.
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
    urlize and extract_hashtags.py.
    """
    def repl(m: re.Match) -> str:
        tag = m.group("tag")
        if not tag:
            return m.group(0)   # protected region, or already a tag link
        return f"[#{tag}](/tags/{tag.lower()}/)"

    return HASHTAG_RE.sub(repl, body)
