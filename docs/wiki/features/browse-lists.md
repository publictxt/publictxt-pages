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
created, updated` (RFC 3339), `summary`, `bookmarks[]`.

A list declares which subset it shows rather than carrying data:

| `data-scope-kind` | Shows | Server equivalent |
|---|---|---|
| `section` | pages below this path | `.RegularPagesRecursive` |
| `tag` | pages with this tag | term `.Pages` |
| `bookmarks` | `bookmarks/` + any page with a bookmark URL | `bookmark-pages.html` |
| `recent` | N most recently updated, site-wide | home |

Six sorts from `sorts.js`, and three facets: **type and tags as chip rows** with
counts *within the current result set* (type single-select, tags AND-ed), and **year
as a select beside Sort**. A facet is hidden when the list doesn't vary on it — how a
tag page hides its own tag, and a single year of posts gets no year control at all.
Chips sit most-frequent-first; years run newest-first.

Year is a select rather than a third chip row because it is the least-reached-for of
the three, and one line of chrome scales past a decade of values where chips do not.
Its counts are taken *before* the year filter applies (`forYear` in `render`), so a
single-select option never reads "0" next to a year that does have pages — the type
chips, being chips, still show the post-filter 0s.

A page's **year is the year of its `created` date**, in the page's own offset —
`yearOf()` slices it out of the RFC 3339 string so it matches the year Hugo gives
Pagefind (see [../traps.md](../traps.md)); `updated` has no facet. State lives in
`?tag=a&tag=b&type=wiki&year=2024&sort=title&page=2` (`q` reserved for search), and
the three facets spell the same way on [search.md](search.md). Home *Recent* passes
`data-compact`: cards only.

Chips are JS-only either way: the no-JS `<ul>` fallback has no filtering.

Defaults `params.listOrder` / `listPerPage`; a section index overrides with `order:` /
`perPage:`, inherited by sub-folders via the `.Ancestors` walk in `list-order.html`.
