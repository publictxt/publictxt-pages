---
covers:
  - layouts
  - assets/js
  - scripts
---

# Features

One capability per page, mapped to the code that produces it. Start here — each page
links the files it describes.

| Feature | Covers | Why |
|---|---|---|
| [Sections](sections.md) | folders as sections, every folder browsable, ordering, home cards | [D2](../decisions/D2.md), [D10](../decisions/D10.md) |
| [Browse lists](browse-lists.md) | client-side sortable, filterable, paged lists | [D6](../decisions/D6.md), [D7](../decisions/D7.md) |
| [Search](search.md) | Pagefind full-text + facets, filter-only, sorting | [D8](../decisions/D8.md) |
| [Tags](tags.md) | inline `#hashtags`, tag pages, tag cloud | [D3](../decisions/D3.md) |
| [Dates](dates.md) | the `created`/`updated` ladders and how dates display | [D4](../decisions/D4.md) |
| [Bookmarks](bookmarks.md) | `bookmark:` front matter, the section, link chips | — |
| [Breadcrumbs](breadcrumbs.md) | ancestor trail, folder-name labels, literal date folders | — |
| [Theme](theme.md) | page shell, sidebar blocks, CSS, responsive | [D9](../decisions/D9.md) |

## Cross-cutting

- **Nothing reads the source repo directly.** Hugo's content is `build/content/`,
  written by the sync step. Any "how does Hugo know X" resolves to front matter sync
  wrote, or to [hugo.toml](../src/config.md). See [build](../build.md).
- **One index, many lists** — home Recent, every section and tag page render from a
  single site-wide `index.json`, fetched once per visit ([D7](../decisions/D7.md)).
- **One sort vocabulary** — `sorts.js` defines the six options and their `?sort=`
  spellings; lists and search both import it.
- **One card renderer** — `cards.js`; search maps Pagefind hits onto the index item
  shape to reuse it.
- **"Recent" means recently *updated*** everywhere, by default — not newest.

Source-side view: [src/index.md](../src/index.md).
