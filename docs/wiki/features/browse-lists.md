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

Every list of pages on the site — the home *Recent* block, each section, each tag
page, the Bookmarks collection — is the same component: Hugo renders a plain
`<ul>` of links, then `assets/js/list.js` replaces it with sortable, filterable,
paged cards ([D6](../decisions/D6.md)).

## One index, many lists

The whole site ships **one** `index.json`, built by
`layouts/_partials/site-index.html` from `site.RegularPages` and published as a
fingerprinted asset. Its URL is on `<html data-index>`; `site-index.js` fetches it
once per document and shares the promise with every list on the page
([D7](../decisions/D7.md)).

Per item (~300 bytes): `url, title, type, section, tags[], created, updated`
(RFC 3339), `summary` (plainified, 180 chars), and `bookmarks[]` when present.

A list page declares **which subset** it shows rather than carrying its own data:

| `data-scope-kind` | Shows | Server-side equivalent |
|---|---|---|
| `section` | pages whose URL is below this path | `.RegularPagesRecursive` |
| `tag` | pages carrying this tag (case-insensitive) | term `.Pages` |
| `bookmarks` | the `bookmarks/` subtree plus any page with a bookmark URL | `bookmark-pages.html` |
| `recent` | the N most recently updated, site-wide | home |

`scope()` in `site-index.js` implements all four. They are deliberately the
client-side mirror of the collections the templates pass to the fallback list — if
you change one, change the other or the no-JS view diverges.

## What the reader gets

- **Sort** — six options from `sorts.js`: recently updated (default), newest,
  oldest, title A→Z, title Z→A, least recently updated. Ties break on title.
- **Filter chips** — tag and type, with live counts *within the current result
  set*. Multiple tags are **AND**ed. A facet is hidden when the list doesn't vary
  on it: a single-type section gets no type row, and a tag page hides its own tag
  (the filter counts every item, so it would do nothing).
- **Paging** — `params.listPerPage`, overridable per section. Real `<a href>`
  pager links, so ctrl-click opens a new tab; plain clicks are intercepted.
- **URL state** — `?tag=a&tag=b&type=wiki&sort=title&page=2`, pushed to history so
  views are linkable and Back works. Non-defaults only. `q` is reserved for search.
- **Status line** — "12 pages of 40 — wiki · #python · Recently updated · page 2 of 3".

Tag chips *on cards* are filter buttons inside a list, and plain links elsewhere.
On a tag page this gives tag **combinations** without leaving the page.

Home *Recent* passes `data-compact`: cards only, no controls, no pager, no URL
state.

## Defaults and the cascade

`params.listOrder` and `params.listPerPage` in `hugo.toml` set site defaults. A
section index can override either with `order:` / `perPage:` in its front matter,
and the override **inherits to sub-folders** — `order: title` on `wiki/index.md`
covers the whole wiki. `list-order.html` / `list-per-page.html` walk `.Ancestors`
to resolve this.

Order strings are `"<field>[ asc|desc]"` over `updated | created | title`;
direction defaults to newest-first for dates and A→Z for titles, so `"created asc"`
is oldest-first.

## Without JavaScript

The fallback `<ul>` is real markup with every page's link, type and date — it is
what crawlers index and what a reader with JS off sees. `list.js` also bails out
silently (leaving the fallback in place) if the index fetch fails.

## Where to look

`docs/wiki/src/js.md` for module-by-module detail, `docs/wiki/src/layouts.md` for
the partials.
