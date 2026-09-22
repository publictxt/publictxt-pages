---
covers:
  - scripts/sync_content.py
  - layouts/_partials/sections.html
  - layouts/section.html
  - layouts/home.html
  - hugo.toml
---

# Sections

Every top-level folder of the source repo (`wiki/`, `blog/`, `notes/`, `bookmarks/`,
`posts/`, …) is a section. Root-level `.md` files are plain pages. A folder's name
is its default `type`.

## Every folder is browsable

Hugo only treats a folder as a section when it contains `_index.md`. Real wikis
don't have those — they have `index.md`, `home.md`, or nothing at all. The sync
step closes all three gaps:

- `index.md` / `home.md` → renamed to `_index.md` in the copy. Without this Hugo
  reads the folder as a *leaf bundle* and hides every sibling page inside it as a
  resource — fatal for a wiki.
- Link destinations pointing at `index.md` / `home.md` are rewritten to `_index.md`
  so the embedded link render hook still resolves them.
- A folder with Markdown but no index page at all gets a minimal generated
  `_index.md`, titled after the folder, dated from its contents.

Consequence: **sections nest to any depth.** `wiki/A/B/` is as much a section as
`wiki/` is, appears in breadcrumbs, and lists its own subtree.

## Ordering

`params.sectionOrder` in `hugo.toml` lists section folder names in navigation
order; anything unlisted follows alphabetically. `layouts/_partials/sections.html`
resolves this and is the single source for both the sidebar and the home page's
Browse cards. Hugo's own section order is by date, which would reshuffle the
navigation on every edit — see [D10](../decisions/D10.md).

Section links use the **folder name** (`.Section | humanize`), not the `_index.md`
title, because authors title index pages freely ("wiki home"). Breadcrumbs follow
the same rule.

## The section page

`layouts/section.html` renders, in order:

1. Title, type chip, dates, tag chips — with Pagefind sort keys attached.
2. The index body as prose, in its own `data-pagefind-body` — **a section index
   body is real content** and is searchable like any page.
3. A [browse list](browse-lists.md) of `.RegularPagesRecursive`, scoped
   `section` at the section's `RelPermalink`, with `order:` / `perPage:` resolved
   through the ancestor cascade.

`layouts/bookmarks/section.html` is the same template with a different page
collection — see [bookmarks](bookmarks.md).

Empty sections render "No pages in this section yet."

## Home

`layouts/home.html` shows the `index.md` body (or `params.description`), a Browse
card per section with its recursive page count and newest content date, a Search
card, and a compact Recent list of `params.recentLimit` pages.

The Bookmarks card counts `bookmark-pages.html` rather than the folder, so a page
carrying `bookmark:` from elsewhere is included in the count.

## Where to look

`docs/wiki/src/sync.md` (the rename and index generation), `docs/wiki/src/layouts.md`
(templates), `docs/wiki/src/config.md` (`sectionOrder`).
