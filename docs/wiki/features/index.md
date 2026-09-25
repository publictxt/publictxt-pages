---
covers:
  - scripts/sync_content.py
  - assets/js/site-index.js
  - assets/js/sorts.js
  - assets/js/cards.js
---

# Features

One page per capability and the files that do it. See the map in
[../index.md](../index.md) and [../traps.md](../traps.md) before editing.

| Page | Covers |
|---|---|
| [sections.md](sections.md) | folders as sections, ordering, post-folder leaf bundles, `publish: off` |
| [browse-lists.md](browse-lists.md) | the site index, sortable/filterable/paged lists |
| [search.md](search.md) | Pagefind full-text + facets, filter-only, sorting |
| [categories.md](categories.md) | closed `category:` list, facets, toggle |
| [ratings.md](ratings.md) | `rating:` 1–5, minimum / *Unrated* filter, rating sorts, stars |
| [tags.md](tags.md) | inline `#hashtags`, tag pages, tag cloud |
| [dates.md](dates.md) | `created`/`updated` ladders and display |
| [embeds.md](embeds.md) | YouTube links in image syntax become players |
| [bookmarks.md](bookmarks.md) | `bookmark:` front matter, the section, link chips |
| [breadcrumbs.md](breadcrumbs.md) | ancestor trail |
| [theme.md](theme.md) | page shell, sidebar, CSS, footer |

Across everything:

- **Hugo never reads the source repo** — only `build/content/`, which sync writes.
- **One index, many lists** *([D7](../decisions/D7.md))*; **one sort vocabulary**
  (`sorts.js`) and **one card** (`cards.js`) for lists and search.
- **"Recent" = recently updated**, only on home and the `recent` scope; lists and
  search default to Newest (`created`).
