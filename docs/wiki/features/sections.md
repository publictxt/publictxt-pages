---
covers:
  - scripts/sync_content.py
  - layouts/_partials/sections.html
  - layouts/section.html
  - layouts/home.html
  - hugo.toml
---

# Sections

Every top-level folder is a section (`wiki/`, `blog/`, `notes/`, `bookmarks/`, …);
root-level `.md` are plain pages. A folder's name is its default `type`.

## Every folder is browsable

Hugo only treats a folder as a section when it holds `_index.md`. Real wikis have
`index.md`, `home.md`, or nothing. [sync_content.py](../src/sync.md) closes all three
([D2](../decisions/D2.md)):

- `index.md` / `home.md` → `_index.md` in the copy. Otherwise Hugo reads the folder
  as a **leaf bundle** and hides every sibling page as a resource — fatal for a wiki.
- Link destinations naming those files are rewritten to match.
- A folder with Markdown but no index gets a generated `_index.md`, titled after the
  folder, dated from its contents.

So **sections nest to any depth**: `wiki/A/B/` is as much a section as `wiki/`,
appears in breadcrumbs, and lists its own subtree.

## Ordering

`params.sectionOrder` lists folder names in navigation order; unlisted follow
alphabetically. [sections.html](../../../layouts/_partials/sections.html) resolves it
and is the single source for both the sidebar and the home Browse cards. Hugo's own
order is by date, which would reshuffle navigation on every edit
([D10](../decisions/D10.md)).

Links use the **folder name** (`.Section | humanize`), not the `_index.md` title —
authors title index pages freely ("wiki home"). Breadcrumbs follow the same rule.

## The pages

[section.html](../../../layouts/section.html) renders title, type chip, dates and tag
chips with Pagefind sort keys; then the index body as prose in its own
`data-pagefind-body` — **a section index body is real content**, searchable like any
page; then a [browse list](browse-lists.md) of `.RegularPagesRecursive` scoped
`section`, with `order:` / `perPage:` from the ancestor cascade. Empty sections say
so. [bookmarks/section.html](../../../layouts/bookmarks/section.html) is the same
template with a different collection — see [bookmarks](bookmarks.md).

[home.html](../../../layouts/home.html) shows the `index.md` body (or
`params.description`), a Browse card per section with recursive page count and newest
content date, a Search card, and a compact Recent list of `params.recentLimit` pages.
The Bookmarks card counts `bookmark-pages.html`, so pages carrying `bookmark:` from
elsewhere are included.
