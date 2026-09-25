---
covers:
  - assets/js/list.js
  - assets/js/site-index.js
  - layouts/_partials/site-index.html
  - layouts/_partials/list-container.html
  - layouts/_partials/list-order.html
  - layouts/_partials/list-per-page.html
---

# Browse lists

Home *Recent*, sections, tag pages and Bookmarks are one component: Hugo renders a
plain `<ul>` (crawlers, no-JS; kept if the index fetch fails), then `list.js` replaces
it with sortable, filterable, paged cards *([D6](../decisions/D6.md))*.

Data is one fingerprinted `index.json` of `site.RegularPages`
(`site-index.html`), fetched once per document *([D7](../decisions/D7.md))*; item
shape is in `cards.js`. Each list names its subset, mirroring its server collection:

| `data-scope-kind` | Server equivalent |
|---|---|
| `section` | `.RegularPagesRecursive` |
| `tag` | term `.Pages` |
| `bookmarks` | `bookmark-pages.html` |
| `recent` | home, N most recently updated |

Controls: sort (`sorts.js`), type / category / tag chips, year and minimum-rating
selects ([ratings.md](ratings.md)). A facet hides when the list doesn't vary on it —
how a tag page hides its own tag. Single-select options count what picking them
gives. URL spelling is shared with [search.md](search.md). The controls fold on
narrow screens unless the URL sets a filter or sort. Home *Recent* is `data-compact`:
cards only.

Default sort is **Newest** (`params.listOrder`); a section index overrides with
`order:` / `perPage:` for its subtree (`list-order.html`).
