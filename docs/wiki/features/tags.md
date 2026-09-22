---
covers:
  - scripts/hashtags.py
  - scripts/extract_hashtags.py
  - layouts/_partials/tag-cloud.html
  - layouts/term.html
  - layouts/taxonomy.html
---

# Tags

Tags come from two places and end up in one: front matter `tags:`, and inline
`#hashtags` in the body. The sync pipeline merges them, so a page's visible tags
and the tag cloud can never disagree ([D3](../decisions/D3.md)).

## What counts as a hashtag

Defined **once**, in `scripts/hashtags.py`, and shared by both preprocessing
scripts. A hashtag is `#` + a letter + letters/digits/`_`/`-`, and must not follow
a word character, `/` or `&`.

Not recognised inside: fenced or inline code, HTML tags, existing links or images,
or bare URLs — so `https://example.org/page/#section` is not a tag.

An already-linkified hashtag (`[#tag](/tags/tag/)`) still *counts* as that tag and
is never re-linked. That is what makes both operations idempotent and order-
independent.

## The two operations

| Step | Script | Effect |
|---|---|---|
| Linkify | `sync_content.py` (via `hashtags.linkify`) | `#tag` in the body becomes `[#tag](/tags/tag/)`. **Visible text stays `#tag`**, so the file still reads as plain text in Obsidian or on GitHub. |
| Merge | `extract_hashtags.py` | Body hashtags are added to front matter `tags`, de-duplicated, order preserved. Creates front matter if there is none. **Never strips hashtags from the body.** |

The merge step touches only the `tags` key; every other front matter line passes
through untouched. It understands inline `[a, b]`, block `- a` and scalar forms,
and rewrites in inline form.

Tag slugs are the lower-cased tag, which matches Hugo's `urlize` and what the
front matter receives. The link destination is site-relative (`/tags/x/`) and the
embedded link render hook resolves it, so sub-path deployments get the right prefix.

## Tag pages

- `/tags/` (`taxonomy.html`) — the full cloud, no limit, and a pointer to search
  for *combinations*.
- `/tags/<term>/` (`term.html`) — a [browse list](browse-lists.md) scoped `tag`,
  plus a deep link to `/search/?tag=<term>`.
- Sidebar cloud (`tag-cloud.html`) — top `params.tagCloudLimit` terms by count,
  each sized into one of four weight buckets (`ceil(4 × count / max)`) and
  rendered as `.tag-w1`–`.tag-w4`.

Within a browse list, tag chips are AND-able filter buttons, so tag combinations
work on tag pages too, not only in search.

## Where to look

`docs/wiki/src/hashtags.md` for the regex and the merge parser.
