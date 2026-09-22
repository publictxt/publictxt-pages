---
covers:
  - layouts/_partials/bookmark-urls.html
  - layouts/_partials/bookmark-pages.html
  - layouts/_partials/bookmark-links.html
  - layouts/_partials/bookmark-label.html
  - layouts/bookmarks/section.html
---

# Bookmarks

A bookmark is a page that points at a web resource. Two things make a page one:

1. living under `bookmarks/` (typically `bookmarks/sites/<domain>/<page>.md`, one
   file per resource), or
2. carrying `bookmark:` (or `bookmarks:`) in its front matter — **anywhere in the
   repo**, whatever its section.

The second case is the point: a wiki page about a tool can be listed among the
bookmarks *without being moved there*. It keeps its own location, type, URL and
breadcrumbs; only its listing is shared.

## The front matter key

`bookmark:` is the spec key; `bookmarks:` is accepted because it is already in use
in the wild. Either takes a single URL or a list. `bookmark-urls.html` normalises
all four shapes to a de-duplicated slice of strings and is the **only** place that
reads these keys.

```yaml
bookmark: https://example.org/thing
# or
bookmarks:
  - https://example.org/thing
  - https://example.org/other
```

## Where the URLs appear

| Surface | Partial |
|---|---|
| Page header, under the title | `bookmark-links.html` |
| Sidebar meta block | `sidebar.html` (calls `bookmark-urls.html`) |
| Card in any browse list or search result | `cards.js` (from the index's `bookmarks[]`) |

The label drops scheme, `www.` and a trailing slash, prefixed with `↗` —
`bookmark-label.html` on the server, `bookmarkLabel()` in `cards.js` in the
browser. Links carry `rel="noopener external" target="_blank"`.

## The Bookmarks section

`layouts/bookmarks/section.html` is the generic section template with one
difference: the **top-level** `bookmarks/` page gathers `bookmark-pages.html` —
the `bookmarks/` subtree *plus* every page elsewhere carrying a bookmark URL —
and scopes its list `bookmarks`. Sub-folders of `bookmarks/` behave like any
section and list their own subtree.

`bookmark-pages.html` scans every page in the site, so it is always called through
`partialCached`. The home page's Bookmarks card and the sidebar count use it too,
so the counts include gathered pages.

Without a `bookmarks/` folder in the source repo there is no section to list into,
and `bookmark:` only affects the page's own chips and cards.
