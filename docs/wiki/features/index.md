---
covers:
  - layouts
  - assets/js
  - scripts
---

# Features

Each page maps one user-visible capability to the code that produces it. Start here,
not in `src/` — these pages name the files worth opening.

| Feature | What it covers | Key files | Decisions |
|---|---|---|---|
| [Sections](sections.md) | Top-level folders as sections, every folder browsable, section ordering, home cards | `sync_content.py`, `sections.html`, `section.html` | [D2](../decisions/D2.md), [D10](../decisions/D10.md) |
| [Browse lists](browse-lists.md) | Client-side sortable/filterable/paged lists on home, sections, tag pages | `list.js`, `site-index.js`, `list-container.html` | [D6](../decisions/D6.md), [D7](../decisions/D7.md) |
| [Search](search.md) | Pagefind full-text + facets, filter-only browsing, sorting | `search.js`, `search.html`, `pagefind-sort.html` | [D8](../decisions/D8.md) |
| [Tags](tags.md) | Inline `#hashtags`, tag pages, tag cloud | `hashtags.py`, `extract_hashtags.py`, `tag-cloud.html` | [D3](../decisions/D3.md) |
| [Dates](dates.md) | The `created`/`updated` ladders and how dates are displayed | `dates.py`, `page-date.html`, `recent.html` | [D4](../decisions/D4.md) |
| [Bookmarks](bookmarks.md) | `bookmark:` front matter, the Bookmarks section, link chips | `bookmark-*.html`, `bookmarks/section.html` | — |
| [Breadcrumbs](breadcrumbs.md) | Ancestor trail, folder-name labels, literal date folders | `breadcrumbs.html`, `crumb-label.html` | — |
| [Theme & sidebar](theme.md) | Page shell, sidebar blocks, CSS, responsive behaviour | `baseof.html`, `sidebar.html`, `main.css` | [D9](../decisions/D9.md) |

## Cross-cutting facts

Worth knowing before reading any single page:

- **Nothing reads the source repo directly.** Hugo's content is `build/content/`,
  produced by the sync step. Every "how does Hugo know X" question resolves to
  either front matter the sync step wrote, or `hugo.toml`. See [build](../build.md).
- **One index, many lists.** Home Recent, every section and every tag page render
  from a single site-wide `index.json`, fetched once per visit ([D7](../decisions/D7.md)).
- **One sort vocabulary.** `assets/js/sorts.js` defines the six sort options and
  their `?sort=` spellings; both the browse lists and search import it.
- **One card renderer.** `assets/js/cards.js` draws every result card on the site;
  search maps Pagefind hits onto the index item shape to reuse it.
- **"Recent" means recently *updated*,** everywhere, by default — not newest.
