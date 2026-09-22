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
`#hashtags`. The pipeline merges them, so a page's visible tags and the tag cloud can
never disagree ([D3](../decisions/D3.md)).

What counts as a hashtag is defined **once**, in
[hashtags.py](../src/hashtags.md), shared by both preprocessing scripts: `#` + a
letter + letters/digits/`_`/`-`, not after a word character, `/` or `&`, and never
inside code, links or URLs.

## The two operations

| Step | Where | Effect |
|---|---|---|
| Linkify | [sync_content.py](../src/sync.md) | `#tag` → a link to its tag page. **Visible text stays `#tag`**, so the file still reads as plain text in Obsidian or on GitHub. |
| Merge | [extract_hashtags.py](../src/hashtags.md) | Body hashtags added to front matter `tags`, de-duplicated, order preserved. **Never strips hashtags from the body.** |

The merge touches only `tags`; every other front matter line passes through. Slugs
are the lower-cased tag, matching Hugo's `urlize`. Destinations are site-relative and
the embedded link render hook resolves them, so sub-path deployments get the right
prefix.

## Tag pages

| Page | Template | Shows |
|---|---|---|
| `/tags/` | [taxonomy.html](../../../layouts/taxonomy.html) | the full cloud, no limit, plus a pointer to search for *combinations* |
| `/tags/<term>/` | [term.html](../../../layouts/term.html) | a [browse list](browse-lists.md) scoped `tag`, plus a deep link to `/search/?tag=<term>` |
| sidebar | [tag-cloud.html](../../../layouts/_partials/tag-cloud.html) | top `params.tagCloudLimit` terms by count, sized into four buckets (`ceil(4 × count / max)` → `.tag-w1`–`.tag-w4`) |

Within a browse list, tag chips are AND-able filter buttons, so combinations work on
tag pages too, not only in search.
