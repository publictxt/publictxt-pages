---
covers:
  - scripts/hashtags.py
  - scripts/extract_hashtags.py
---

# scripts/hashtags.py, scripts/extract_hashtags.py

Behaviour: [features/tags.md](../features/tags.md). Reasoning: [D3](../decisions/D3.md).

## hashtags.py — the definition

67 lines, one regex, two functions, imported by both preprocessing scripts.

```python
HASHTAG_RE                            # the one definition
find_hashtags(body) -> list[str]      # lowercased, first-appearance order
linkify(body) -> str                  # bare #tag -> a link to its tag page
```

`HASHTAG_RE` has three alternatives and **the order is the logic**:

1. an already-linkified hashtag — still counts as that tag, matched first so it is
   never re-linked. A negative lookbehind excludes images.
2. `(?P<protected>…)` — regions that never contain tags: inline links and images,
   fenced code (both styles), inline code, HTML tags and autolinks, bare URLs.
   Matched before 3, so the match consumes the region and any `#` inside it.
3. `(?<![\w/&])#(?P<tag>[A-Za-z][A-Za-z0-9_-]*)` — a bare hashtag in prose. The
   lookbehind is what excludes `page/#section` and `&#8212;`.

`linkify` returns the match unchanged for 1 and 2, so protected regions pass through
byte-identical. That is what makes both operations idempotent and order-independent.

> Editing this regex changes what every page is tagged with.

## extract_hashtags.py — the merge

```console
python scripts/extract_hashtags.py [content_dir]     # default: content
```

Walks `*.md`, merges body hashtags into front matter `tags`, prints each changed file.
Idempotent — a second run reports 0 changes.

| Function | Contract |
|---|---|
| `parse_tags(fm_text)` | `(tags, span_or_None)` — line span of the `tags` entry. Handles inline `[a, b]`, block `- a`, scalar. |
| `render_tags_line(tags)` | Always rewrites as inline `tags: ["a", "b"]`. |
| `process_file(path)` | `True` if written. De-dupes with `dict.fromkeys`, preserves order, early-returns when unchanged, creates front matter when absent. |

## Gotchas

- `FRONT_MATTER_RE` here requires bare `\n` (no CRLF tolerance, unlike
  [sync_content.py](sync.md)). Safe because it runs on sync output; not safe pointed
  at a raw Windows-authored repo.
- Front matter tags keep their authored case; body tags are lower-cased. `urlize`
  lands both on the same term page, but chip text can differ.
- Defaults to `content`; the build scripts pass `build/content` explicitly.
