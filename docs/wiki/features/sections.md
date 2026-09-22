---
covers:
  - scripts/sync_content.py
  - layouts/_partials/sections.html
  - layouts/section.html
  - hugo.toml
---

# Sections

Every top-level folder is a section (`wiki/`, `blog/`, `notes/`, …); root-level `.md`
are plain pages. A folder's name is its default `type`.

Hugo only treats a folder as a section when it holds `_index.md`; real wikis have
`index.md`, `home.md` or nothing. `sync_content.py` renames the first two, rewrites
links pointing at them, and generates a minimal index for folders that have neither
*([D2](../decisions/D2.md))*. Without this Hugo reads a folder containing `index.md`
as a **leaf bundle** and hides every sibling page as a resource. Consequence:
sections nest to any depth, and every folder appears in breadcrumbs.

`params.sectionOrder` fixes navigation order, unlisted folders following
alphabetically; `sections.html` is the single source for both sidebar and home
*([D10](../decisions/D10.md))*.

`section.html` renders the index body as prose in its **own** `data-pagefind-body` —
a section index body is real content, searchable like any page — then a browse list
of `.RegularPagesRecursive`. See [browse-lists.md](browse-lists.md).
