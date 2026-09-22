---
covers:
  - assets/js/list.js
  - assets/js/site-index.js
  - assets/js/cards.js
  - assets/js/sorts.js
  - layouts/_partials/list-container.html
  - layouts/_partials/list-json.html
  - layouts/_partials/site-index.html
  - layouts/_partials/list-order.html
  - layouts/_partials/list-per-page.html
  - layouts/_partials/recent.html
---

# Browse lists

Every page list — home *Recent*, each section, each tag page, the Bookmarks
collection — is one component: Hugo renders a plain `<ul>` of links, then
[list.js](../../../assets/js/list.js) replaces it with sortable, filterable, paged
cards ([D6](../decisions/D6.md)).

## One index, many lists

The site ships **one** `index.json`, built by
[site-index.html](../../../layouts/_partials/site-index.html) from
`site.RegularPages` and published as a fingerprinted asset. Its URL sits on
`<html data-index>`; [site-index.js](../../../assets/js/site-index.js) fetches it once
per document and shares the promise ([D7](../decisions/D7.md)).

Per item (~300 B), from
[list-json.html](../../../layouts/_partials/list-json.html): `url, title, type,
section, tags[], created, updated` (RFC 3339), `summary` (plainified, 180 chars),
`bookmarks[]` when present.

A page declares **which subset** it shows rather than carrying data:

| `data-scope-kind` | Shows | Server equivalent |
|---|---|---|
| `section` | pages below this path | `.RegularPagesRecursive` |
| `tag` | pages with this tag (case-insensitive) | term `.Pages` |
| `bookmarks` | `bookmarks/` subtree + any page with a bookmark URL | `bookmark-pages.html` |
| `recent` | the N most recently updated, site-wide | home |

These mirror the collections the templates pass to the fallback list — change one,
change the other or the no-JS view diverges.

## What the reader gets

- **Sort** — six options from [sorts.js](../../../assets/js/sorts.js): recently
  updated (default), newest, oldest, title A→Z, Z→A, least recently updated. Ties
  break on title.
- **Filter chips** — tag and type, counts computed *within the current result set*.
  Tags **AND**. A facet is hidden when the list doesn't vary on it: a single-type
  section gets no type row, a tag page hides its own tag.
- **Paging** — `params.listPerPage`, overridable per section. Real `<a href>` links,
  so ctrl-click opens a tab.
- **URL state** — `?tag=a&tag=b&type=wiki&sort=title&page=2`, non-defaults only,
  pushed to history. `q` is reserved for search.
- Tag chips on cards are filter buttons inside a list, plain links elsewhere — so a
  tag page gives tag **combinations** without leaving it.

Home *Recent* passes `data-compact`: cards only, no controls, pager or URL state.

## Defaults and the cascade

`params.listOrder` / `params.listPerPage` set site defaults. A section index
overrides either with `order:` / `perPage:`, and the override **inherits to
sub-folders** — `order: title` on `wiki/index.md` covers the whole wiki, resolved by
[list-order.html](../../../layouts/_partials/list-order.html) and
[list-per-page.html](../../../layouts/_partials/list-per-page.html) walking
`.Ancestors`.

Order strings are `"<field>[ asc|desc]"` over `updated | created | title`; direction
defaults to newest-first for dates and A→Z for titles, so `"created asc"` is
oldest-first.

## Without JavaScript

The fallback `<ul>` carries every page's link, type and date — what crawlers index.
`list.js` also bails out silently, leaving it in place, if the index fetch fails.
