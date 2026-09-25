---
covers:
  - layouts/_partials/bookmark-urls.html
  - layouts/_partials/bookmark-pages.html
  - layouts/bookmarks/section.html
---

# Bookmarks

A page is a bookmark **only** if it has `bookmark:` / `bookmarks:`, wherever it lives —
the `bookmarks/` folder is just filing (`sites/<domain>/` for URL pages, `wiki/` for
pages about them). `bookmark-urls.html` is the only reader of those keys;
`bookmark-pages.html` gathers the set for the top-level Bookmarks page, mirrored by the
`bookmarks` kind in `scope()` (`site-index.js`). Sub-folders are ordinary sections.
Sync warns on a page under `bookmarks/` (outside `wiki/`) with no URL.

URLs show in the page header, sidebar and cards, labelled by `bookmark-label.html` /
`bookmarkLabel()` — a client/server pair ([../traps.md](../traps.md)).
`bookmarks/section.html` is `section.html` with that collection swapped in, including
the `pagefind-keys.html` span.
