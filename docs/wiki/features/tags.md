---
covers:
  - scripts/hashtags.py
  - scripts/extract_hashtags.py
  - layouts/_partials/tag-cloud.html
  - layouts/term.html
  - layouts/taxonomy.html
---

# Tags

Front matter `tags:` and inline `#hashtags` merge into one list, so a page's visible
tags and the tag cloud can never disagree *([D3](../decisions/D3.md))*. What counts
as a hashtag is defined once in `hashtags.py`: `#` + a letter + letters/digits/`_`/
`-`, not after a word character, `/` or `&`, never inside code, links or URLs.

`sync_content.py` linkifies `#tag` to its tag page **leaving the visible text as
`#tag`**, so the file still reads as plain text in Obsidian or on GitHub.
`extract_hashtags.py` merges body tags into front matter, de-duplicated, and never
strips them from the body. Both are idempotent and order-independent.

`/tags/` is the full cloud; `/tags/<term>/` is a browse list plus a deep link to
`/search/?tag=<term>`; the sidebar shows the top `params.tagCloudLimit` terms in four
weight buckets.
