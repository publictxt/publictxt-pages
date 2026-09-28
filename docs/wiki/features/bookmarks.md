---
covers:
  - layouts/_partials/bookmark-urls.html
  - layouts/_partials/page-types.html
---

# Bookmarks

A page with `bookmark:` / `bookmarks:` gains type `bookmarks` (`page-types.html`), so
the top-level Bookmarks section lists it wherever it lives — no special template, just
the type rule in [sections.md](sections.md). Pages filed under `bookmarks/` are that
type by folder, URL or not (`sites/<domain>/` for URL pages, `wiki/` for pages about
them). `bookmark-urls.html` is the only reader of the keys. Sync warns on a page under
`bookmarks/` (outside `wiki/`) with no URL.

URLs show in the page header, sidebar and cards, labelled by `bookmark-label.html` /
`bookmarkLabel()` — a client/server pair ([../traps.md](../traps.md)).
