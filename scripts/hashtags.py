#!/usr/bin/env python3
"""
hashtags.py

One definition of what counts as an inline #hashtag, shared by the two
preprocessing scripts: sync_content.py linkifies hashtags, extract_hashtags.py
merges them into front matter `tags`. Sharing the rule is what stops a page's
visible tags and the tag cloud from disagreeing.

A hashtag is `#` followed by a letter, then letters/digits/`_`/`-`, and must not
follow a word character, `/` or `&`. Hashtags are not recognised inside fenced
or inline code, HTML tags, existing links, or URLs — a fragment such as
`https://example.org/page/#section` is not a tag.

An already-linkified hashtag (`[#tag](/tags/tag/)`) still counts as that tag and
is never re-linked, so both operations are idempotent and can run in any order.
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
    Turn bare `#hashtag`s into links to their tag page, leaving the visible text
    as `#hashtag` so the page still reads as plain text in Obsidian or on GitHub.

    The destination is the site-relative term path; Hugo's embedded link render
    hook resolves it to the term page's RelPermalink, so subpath deployments get
    the right prefix. The slug is the lowercased tag, matching both Hugo's
    urlize and what extract_hashtags.py writes to front matter.
    """
    def repl(m: re.Match) -> str:
        tag = m.group("tag")
        if not tag:
            return m.group(0)   # protected region, or already a tag link
        return f"[#{tag}](/tags/{tag.lower()}/)"

    return HASHTAG_RE.sub(repl, body)
