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

One exception is deliberate: a **post folder** — one non-index Markdown file plus
attachments, no subfolders (e.g. `Post-Name/title.md` + `image.png`) — is a leaf
bundle in disguise, not a section. `sync_content.py` detects it structurally
(`find_leaf_bundle_dirs`) and renames its Markdown file to lowercase `index.md`
instead of generating a section wrapper, so it comes out as Hugo's leaf bundle: one
page, with the attachments as page resources sitting beside it. `index.md`/`home.md`
folders are excluded from this detection — those already mean "section index".

`params.sectionOrder` fixes navigation order (`params.listOrder` the sort *within* a
section's list — see [browse-lists.md](browse-lists.md)), unlisted folders following
alphabetically; `sections.html` is the single source for both sidebar and home
*([D10](../decisions/D10.md))*. Sections group by folder; for a cross-cutting
curated grouping, see [categories.md](categories.md).

`section.html` renders the index body as prose in its **own** `data-pagefind-body` —
a section index body is real content, searchable like any page — then a browse list
of `.RegularPagesRecursive`. Being indexed, it owes Pagefind the `pagefind-keys.html`
span like any page ([../traps.md](../traps.md)). See [browse-lists.md](browse-lists.md).
