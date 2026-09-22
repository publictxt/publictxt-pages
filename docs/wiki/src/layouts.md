---
covers:
  - layouts
---

# layouts/

Hugo templates. ~25 files, all small. Hugo v0.158+ layout conventions: templates
live flat in `layouts/`, partials in `layouts/_partials/`.

## Templates

| File | Renders | Notes |
|---|---|---|
| `baseof.html` | the shell | `data-base` and `data-index` on `<html>` — the JS reads both. Breadcrumbs sit here, not per-template. |
| `home.html` | `/` | Hero (index body or `params.description`), section cards, Search card, compact Recent list. |
| `page.html` | single pages | `data-pagefind-body` on the article; type/date/tag chips carry Pagefind filters and meta. |
| `section.html` | sections | Header, index body as its **own** `data-pagefind-body`, then the browse list (outside the indexed body). |
| `bookmarks/section.html` | `bookmarks/` | Copy of `section.html` differing only in the page collection and scope for the top-level page. |
| `term.html` | `/tags/<t>/` | Browse list scoped `tag`; deep-links `/search/?tag=<t>`. |
| `taxonomy.html` | `/tags/` | Unlimited tag cloud. |
| `search.html` | `/search/` | Static shell (`#search-*` ids); `search.js` fills it. Page source is `site-content/`. |
| `404.html` | not found | — |

Every template carrying `data-pagefind-body` also calls `pagefind-sort.html`.
Adding a new one without it silently drops those pages from sorted search results.

## Partials

### Lists
| Partial | In → out |
|---|---|
| `site-index.html` | *(no arg; call via `partialCached`)* → the published `index.json` URL. Walks every page; fingerprinted in production. |
| `list-json.html` | page collection → JSON string. The item shape `cards.js` consumes. |
| `list-container.html` | dict `{pages, scope{kind,value}, order?, perPage?, compact?}` → `[data-list]` div + no-JS `<ul>`, and loads `list.js`. |
| `list-order.html` | page → order string. `order:` on the page, else nearest ancestor's, else `params.listOrder`, else `"updated"`. |
| `list-per-page.html` | page → int. Same cascade over `perPage:`; `0` means "let `list.js` decide". |
| `recent.html` | page collection → `sort . "Lastmod" "desc"`. The one definition of newest-first. |

### Page furniture
| Partial | In → out |
|---|---|
| `head.html` | page → `<head>` contents. CSS minified+fingerprinted+SRI in production only. |
| `sidebar.html` | page → sections list, page meta (single pages, not search), tag cloud. |
| `breadcrumbs.html` | page → the `.Ancestors` trail; nothing on home. |
| `crumb-label.html` | page → one short label. Date folders kept literal. |
| `sections.html` | *(no arg)* → top-level sections in `params.sectionOrder`, rest alphabetical. |
| `page-date.html` | dict `{page, detail?}` → `<time>` for created, plus updated when >1 day later. `detail` adds Pagefind meta. |
| `tag-cloud.html` | dict `{limit}` → weighted chips. `limit: 0` = all. |
| `pagefind-sort.html` | page → hidden element with `created`/`updated` (Unix s) and lower-cased `title` sort keys. |

### Bookmarks
| Partial | In → out |
|---|---|
| `bookmark-urls.html` | page → `[]string`. The **only** reader of `bookmark:`/`bookmarks:`; handles scalar or list, both keys, de-duped. |
| `bookmark-pages.html` | *(arg ignored; use `partialCached`)* → `bookmarks/` subtree + every page with a bookmark URL, recent-first. Scans the whole site. |
| `bookmark-links.html` | page → the chip row, or nothing. |
| `bookmark-label.html` | URL string → `↗ example.org/path`. |

## Conventions and traps

- **`partialCached` where a partial scans the site.** `site-index.html`,
  `sections.html` and `bookmark-pages.html` are site-wide and return the same
  value for every page. Calling them uncached is an O(pages²) build.
- **Client/server pairs must be changed together.** `recent.html` ↔ `byUpdated()`,
  `page-date.html` ↔ `dateHTML()`, `bookmark-label.html` ↔ `bookmarkLabel()`, each
  scope kind ↔ `scope()` in `site-index.js`. Divergence shows up as the no-JS view
  disagreeing with the rendered one.
- **Asset pipeline shape**, repeated in `head.html`, `list-container.html` and
  `search.html`: `resources.Get` → transform → fingerprint *in production only* →
  emit with `integrity` when present. `js.Build` uses esbuild bundled with Hugo,
  so no Node is needed for the build.
- Section links use `.Section | humanize`, never the `_index.md` title.
