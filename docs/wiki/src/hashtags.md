---
covers:
  - scripts/hashtags.py
  - scripts/extract_hashtags.py
---

# scripts/hashtags.py, extract_hashtags.py

Behaviour: [features/tags.md](../features/tags.md). Reasoning:
[D3](../decisions/D3.md).

## hashtags.py — the definition

67 lines, one regex, two functions. Imported by both preprocessing scripts so the
rule exists once.

```python
HASHTAG_RE                            # the one definition
find_hashtags(body) -> list[str]      # lowercased, first-appearance order
linkify(body) -> str                  # bare #tag -> [#tag](/tags/tag/)
```

`HASHTAG_RE` has three alternatives, and **the order is the logic**:

1. `(?<!!)\[#(?P<linked>…)\]\(…\)` — an already-linkified hashtag. Still counts as
   that tag; matched first so it is never re-linked. `(?<!!)` excludes images.
2. `(?P<protected>…)` — regions that never contain tags: inline links and images,
   ` ``` ` and `~~~` fences, inline code, HTML tags and autolinks, bare URLs.
   Matched before alternative 3, so the match consumes the region and the `#`
   inside it is never seen.
3. `(?<![\w/&])#(?P<tag>[A-Za-z][A-Za-z0-9_-]*)` — a bare hashtag in prose. The
   lookbehind is what excludes `page/#section` and `&#8212;`.

`linkify` substitutes over the whole regex and returns `m.group(0)` unchanged for
alternatives 1 and 2 — protected regions pass through byte-identical. This is
what makes both operations idempotent and order-independent.

> Editing this regex changes what every page is tagged with. Both scripts and the
> tag cloud follow from it.

## extract_hashtags.py — the merge

```console
python scripts/extract_hashtags.py [content_dir]     # default: content
```

Walks `*.md`, merges body hashtags into front matter `tags`, prints each changed
file. Idempotent: a second run reports 0 changes.

| Function | Contract |
|---|---|
| `parse_tags(fm_text)` | `(tags, (start, end) \| None)` — line span of the `tags` entry. Handles inline `[a, b]`, block `- a`, and scalar. |
| `render_tags_line(tags)` | Always rewrites as inline `tags: ["a", "b"]`. |
| `process_file(path)` | `True` if written. Merges with `dict.fromkeys` (de-dupe, order preserved); returns early when nothing changed. Creates front matter when absent. |

Only the `tags` key is interpreted; every other front matter line is passed
through verbatim. **Body text is never modified** — hashtags stay visible for
Obsidian-style reading.

## Gotchas

- `FRONT_MATTER_RE` here requires bare `\n` (no CRLF tolerance, unlike
  `sync_content.py`). Safe in practice because it runs on sync output, which is
  written with `\n`. It would not be safe pointed at a raw Windows-authored repo.
- Tags from front matter keep their authored case; tags from the body are
  lower-cased. Hugo's `urlize` makes both land on the same term page, but the chip
  text can differ.
- The script takes a directory argument and defaults to `content` — the build
  scripts pass `build/content` explicitly.
