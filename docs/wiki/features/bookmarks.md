---
covers:
  - layouts/_partials/bookmark-urls.html
  - layouts/_partials/bookmark-pages.html
  - layouts/bookmarks/section.html
---

# Bookmarks

A page is a bookmark by living under `bookmarks/` **or** by carrying `bookmark:` /
`bookmarks:` in front matter anywhere in the repo — the point being that a wiki page
about a tool gets listed among the bookmarks without being moved, keeping its own
location, type, URL and breadcrumbs. Either key takes a URL or a list;
`bookmark-urls.html` is the only reader of them.

URLs appear in the page header, the sidebar meta block and on cards, labelled with
scheme, `www.` and trailing slash dropped. The top-level `bookmarks/` page gathers
`bookmark-pages.html`; its sub-folders behave like any section.

`bookmarks/section.html` is `section.html` with that one collection swapped, so it
carries the same `data-pagefind-body` and the same `pagefind-keys.html` span — a
third copy of an obligation [../traps.md](../traps.md) records.
