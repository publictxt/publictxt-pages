---
covers:
  - scripts/hashtags.py
  - scripts/extract_hashtags.py
  - layouts/_partials/tag-cloud.html
  - layouts/term.html
  - layouts/taxonomy.html
---

# Tags

Front matter `tags:` and inline `#hashtags` merge into one list, so visible tags and
the tag cloud agree *([D3](../decisions/D3.md))*. `hashtags.py` defines a hashtag once;
sync linkifies them (text stays `#tag`, so files read the same in Obsidian or on
GitHub) and `extract_hashtags.py` merges them into front matter.

`/tags/` is the full cloud; `/tags/<term>/` a browse list plus a link to
`/search/?tag=<term>`; the sidebar shows the top `params.tagCloudLimit` in four
weight buckets.
