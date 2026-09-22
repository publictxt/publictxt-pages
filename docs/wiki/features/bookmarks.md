---
covers:
  - layouts/_partials/bookmark-urls.html
  - layouts/_partials/bookmark-pages.html
  - layouts/_partials/bookmark-links.html
  - layouts/_partials/bookmark-label.html
  - layouts/bookmarks/section.html
---

# Bookmarks

A bookmark is a page pointing at a web resource. Two things make one:

1. living under `bookmarks/` (typically `bookmarks/sites/<domain>/<page>.md`), or
2. carrying `bookmark:` / `bookmarks:` in front matter — **anywhere in the repo**.

The second case is the point: a wiki page about a tool is listed among the bookmarks
*without being moved there*. It keeps its own location, type, URL and breadcrumbs;
only its listing is shared.

## The front matter key

`bookmark:` is the spec key; `bookmarks:` is accepted because it is already in use in
the wild. Either takes a URL or a list.
[bookmark-urls.html](../../../layouts/_partials/bookmark-urls.html) normalises all
four shapes to a de-duplicated slice and is the **only** reader of these keys.

```yaml
bookmark: https://example.org/thing
bookmarks: [https://example.org/a, https://example.org/b]
```

## Where the URLs appear

| Surface | Source |
|---|---|
| Page header, under the title | [bookmark-links.html](../../../layouts/_partials/bookmark-links.html) |
| Sidebar meta block | [sidebar.html](../../../layouts/_partials/sidebar.html) |
| Card in any list or search result | [cards.js](../src/js.md), from the index's `bookmarks[]` |

The label drops scheme, `www.` and trailing slash, prefixed `↗` —
[bookmark-label.html](../../../layouts/_partials/bookmark-label.html) on the server,
`bookmarkLabel()` in the browser. Links carry `rel="noopener external" target="_blank"`.

## The Bookmarks section

[bookmarks/section.html](../../../layouts/bookmarks/section.html) is the generic
section template with one difference: the **top-level** page gathers
[bookmark-pages.html](../../../layouts/_partials/bookmark-pages.html) — the
`bookmarks/` subtree *plus* every page elsewhere carrying a bookmark URL — and scopes
its list `bookmarks`. Sub-folders behave like any section.

That partial scans every page, so it is always called through `partialCached`. The
home card and sidebar count use it too, so counts include gathered pages. Without a
`bookmarks/` folder there is no section to list into, and `bookmark:` only affects
the page's own chips and cards.
