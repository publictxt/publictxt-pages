---
covers:
  - scripts/sync_content.py
  - layouts/_partials/sections.html
  - layouts/section.html
  - hugo.toml
---

# Sections

Every top-level folder is a section; its name is the default `type`. Root-level `.md`
are plain pages.

Hugo needs `_index.md` for a section, and reads a folder with `index.md` as a leaf
bundle, hiding its siblings. So sync renames `index.md`/`home.md` → `_index.md`,
rewrites links to them, and generates an index for folders with none
*([D2](../decisions/D2.md))*: sections nest to any depth and every folder is in the
breadcrumbs. The renames are why pages record `source_path` ([theme.md](theme.md)).

Exception: a **post folder** (one non-index `.md` + attachments, no subfolders) is
made a real leaf bundle — its `.md` becomes `index.md`, one page with its attachments.

**`publish: off`** (also `false` / `no` / `0`) keeps a page out of `build/content/`,
so out of every list and search; an unpublished post folder goes whole. Hidden, not
private: it stays in the source repo. Loose attachments in an ordinary folder are
still copied, an unpublished `index.md` gets a generated one, and links to the page
dangle.

Navigation order: `params.sectionOrder`, then A→Z, via `sections.html` for sidebar and
home *([D10](../decisions/D10.md))*. `section.html` indexes the index body for search
like a page, so it owes the `pagefind-keys.html` span ([../traps.md](../traps.md)).
