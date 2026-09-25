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

Home *Recent*, each section, each tag page and the Bookmarks collection are one
component: Hugo renders a plain `<ul>`, then `list.js` replaces it with sortable,
filterable, paged cards *([D6](../decisions/D6.md))*. The `<ul>` stays for crawlers
and no-JS readers, and `list.js` bails out silently, leaving it, if the index fetch
fails.

`site-index.html` publishes one fingerprinted `index.json` from `site.RegularPages`;
its URL is on `<html data-index>` and `site-index.js` fetches it once per document
*([D7](../decisions/D7.md))*. Per item (~300 B): `url, title, type, section, tags[],
created, updated` (RFC 3339), `summary`, `bookmarks[]`, `category` (see
[categories.md](categories.md)).

A list declares which subset it shows rather than carrying data:

| `data-scope-kind` | Shows | Server equivalent |
|---|---|---|
| `section` | pages below this path | `.RegularPagesRecursive` |
| `tag` | pages with this tag | term `.Pages` |
| `bookmarks` | `bookmarks/` + any page with a bookmark URL | `bookmark-pages.html` |
| `recent` | N most recently updated, site-wide | home |

Six sorts from `sorts.js`; four facets: type, category and tag chips (type and
category single-select, tags AND-ed) with counts *within the current result set*, and year as a select beside Sort.
A facet is hidden when the list doesn't vary on it, which is how a tag page hides its
own tag. Chips sit most-frequent-first, years newest-first. Year options count over
`forYear` — the set filtered by everything *but* year — so a single-select option
never reads "0" when picking it would return pages; the type chips still show 0s.

A page's **year is its `created` year in the page's own offset**: `yearOf()` slices it
off the RFC 3339 string to match what Hugo gives Pagefind ([../traps.md](../traps.md)).
`updated` has no facet. State lives in
`?tag=a&tag=b&type=wiki&category=essay&year=2024&sort=title&page=2` (`q` reserved for search), spelled
the same way on [search.md](search.md). Home *Recent* passes `data-compact`: cards
only, and the no-JS `<ul>` fallback has no filtering at all.

Lists default to **Newest** (`params.listOrder = "created"`); the two `updated` sorts
sit at the end of the menu. Defaults `params.listOrder` / `listPerPage`; a section index overrides with `order:` /
`perPage:`, inherited by sub-folders via the `.Ancestors` walk in `list-order.html`.
