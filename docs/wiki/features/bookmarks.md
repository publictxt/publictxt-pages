---
covers:
  - layouts/_partials/bookmark-urls.html
  - layouts/_partials/bookmark-pages.html
  - layouts/bookmarks/section.html
---

# Bookmarks

A page is a bookmark if it lives under `bookmarks/` **or** has `bookmark:` /
`bookmarks:` anywhere — so a wiki page about a tool is listed among bookmarks without
moving. `bookmark-urls.html` is the only reader of those keys; `bookmark-pages.html`
gathers the set for the top-level Bookmarks page (sub-folders are ordinary sections).

URLs show in the page header, sidebar and cards, labelled by `bookmark-label.html` /
`bookmarkLabel()` — a client/server pair ([../traps.md](../traps.md)).
`bookmarks/section.html` is `section.html` with that collection swapped in, including
the `pagefind-keys.html` span.
