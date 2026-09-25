---
covers:
  - scripts/sync_content.py
  - assets/js/site-index.js
  - assets/js/sorts.js
  - assets/js/cards.js
---

# Features

One page per capability: what it does and which files do it. Per-file detail is in
the files themselves — see the map in [../index.md](../index.md), and
[../traps.md](../traps.md) before editing.

| Page | Covers |
|---|---|
| [sections.md](sections.md) | top-level folders as sections, every folder browsable, ordering, post-folder leaf bundles |
| [browse-lists.md](browse-lists.md) | the site-wide index, sortable/filterable/paged lists |
| [search.md](search.md) | Pagefind full-text + facets, filter-only, sorting |
| [categories.md](categories.md) | configured closed list, `category:` front matter, facets, toggle |
| [ratings.md](ratings.md) | `rating:` 1–5 front matter, minimum filter, *Top rated* sort, stars |
| [tags.md](tags.md) | inline `#hashtags`, tag pages, tag cloud |
| [dates.md](dates.md) | the `created`/`updated` ladders and how dates display |
| [bookmarks.md](bookmarks.md) | `bookmark:` front matter, the section, link chips |
| [breadcrumbs.md](breadcrumbs.md) | ancestor trail |
| [theme.md](theme.md) | page shell, sidebar, CSS |

Four things hold across everything:

- **Nothing reads the source repo directly.** Hugo's content is `build/content/`,
  written by the sync step. Any "how does Hugo know X" resolves to front matter sync
  wrote, or to `hugo.toml`.
- **One index, many lists** — every browse list is a subset of one site-wide
  `index.json`, fetched once per visit *([D7](../decisions/D7.md))*.
- **One sort vocabulary** (`sorts.js`) and **one card renderer** (`cards.js`), shared
  by the browse lists and search.
- **"Recent" means recently *updated***: the home *Recent* list and the `recent`
  scope, only. Browse lists and search default to **Newest** (`created`).
