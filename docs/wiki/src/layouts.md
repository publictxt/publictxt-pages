---
covers:
  - layouts
---

# [layouts/](../../../layouts/)

Hugo v0.158+ conventions: templates flat in `layouts/`, partials in
`layouts/_partials/`. ~25 files, all small.

## Templates

| File | Renders | Notes |
|---|---|---|
| [baseof.html](../../../layouts/baseof.html) | the shell | `data-base` and `data-index` on `<html>`; breadcrumbs sit here, not per-template |
| [home.html](../../../layouts/home.html) | `/` | hero, section cards, Search card, compact Recent list |
| [page.html](../../../layouts/page.html) | single pages | `data-pagefind-body` on the article; chips carry Pagefind filters and meta |
| [section.html](../../../layouts/section.html) | sections | header, index body as its **own** `data-pagefind-body`, then the browse list outside it |
| [bookmarks/section.html](../../../layouts/bookmarks/section.html) | `bookmarks/` | `section.html` with a different collection and scope for the top-level page |
| [term.html](../../../layouts/term.html) | `/tags/<t>/` | browse list scoped `tag`; deep-links `/search/?tag=<t>` |
| [taxonomy.html](../../../layouts/taxonomy.html) | `/tags/` | unlimited tag cloud |
| [search.html](../../../layouts/search.html) | `/search/` | static shell (`#search-*` ids) that `search.js` fills; page source is `site-content/` |
| [404.html](../../../layouts/404.html) | not found | — |

Every template with `data-pagefind-body` must also call `pagefind-sort.html`.

## Partials — lists

| Partial | In → out |
|---|---|
| [site-index.html](../../../layouts/_partials/site-index.html) | *(no arg; `partialCached`)* → the published `index.json` URL; fingerprinted in production |
| [list-json.html](../../../layouts/_partials/list-json.html) | page collection → JSON string, the item shape `cards.js` consumes |
| [list-container.html](../../../layouts/_partials/list-container.html) | `{pages, scope{kind,value}, order?, perPage?, compact?}` → `[data-list]` div + no-JS `<ul>`, loads `list.js` |
| [list-order.html](../../../layouts/_partials/list-order.html) | page → order string: own `order:`, else nearest ancestor's, else `params.listOrder`, else `"updated"` |
| [list-per-page.html](../../../layouts/_partials/list-per-page.html) | page → int, same cascade over `perPage:`; `0` = let `list.js` decide |
| [recent.html](../../../layouts/_partials/recent.html) | page collection → `sort . "Lastmod" "desc"`; the one definition of newest-first |

## Partials — page furniture

| Partial | In → out |
|---|---|
| [head.html](../../../layouts/_partials/head.html) | page → head contents; CSS minified+fingerprinted+SRI in production only |
| [sidebar.html](../../../layouts/_partials/sidebar.html) | page → sections, page meta (single pages, not search), tag cloud |
| [breadcrumbs.html](../../../layouts/_partials/breadcrumbs.html) | page → the `.Ancestors` trail; nothing on home |
| [crumb-label.html](../../../layouts/_partials/crumb-label.html) | page → one short label; date folders kept literal |
| [sections.html](../../../layouts/_partials/sections.html) | *(no arg)* → top-level sections in `params.sectionOrder`, rest alphabetical |
| [page-date.html](../../../layouts/_partials/page-date.html) | `{page, detail?}` → created, plus updated when >1 day later; `detail` adds Pagefind meta |
| [tag-cloud.html](../../../layouts/_partials/tag-cloud.html) | `{limit}` → weighted chips; `limit: 0` = all |
| [pagefind-sort.html](../../../layouts/_partials/pagefind-sort.html) | page → hidden element with `created`/`updated` (Unix s) and lower-cased `title` sort keys |

## Partials — bookmarks

| Partial | In → out |
|---|---|
| [bookmark-urls.html](../../../layouts/_partials/bookmark-urls.html) | page → URL strings; the **only** reader of `bookmark:`/`bookmarks:`, scalar or list, de-duped |
| [bookmark-pages.html](../../../layouts/_partials/bookmark-pages.html) | *(arg ignored; `partialCached`)* → `bookmarks/` subtree + every page with a bookmark URL, recent-first |
| [bookmark-links.html](../../../layouts/_partials/bookmark-links.html) | page → the chip row, or nothing |
| [bookmark-label.html](../../../layouts/_partials/bookmark-label.html) | URL → short display form |

## Traps

- **`partialCached` where a partial scans the site** — `site-index.html`,
  `sections.html`, `bookmark-pages.html` return the same value for every page.
  Uncached they make the build O(pages squared).
- **Client/server pairs change together**: `recent.html`/`byUpdated()`,
  `page-date.html`/`dateHTML()`, `bookmark-label.html`/`bookmarkLabel()`, scope
  kinds/`scope()`. Divergence shows as the no-JS view disagreeing with the rendered
  one. See [js.md](js.md).
- **Asset pipeline shape**, in `head.html`, `list-container.html` and `search.html`:
  `resources.Get` → transform → fingerprint *in production only* → emit with
  `integrity` when present.
- Section links use `.Section | humanize`, never the `_index.md` title.
