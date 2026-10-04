# Feature: backlinks — "Linked from"

Branch `feat/backlinks`. **Proposed** — not built. Independent of
`feat/reorg-panels-and-filters`, which only keeps this slot free. Updates
[SPEC.md](../SPEC.md), `docs/user/` and the wiki map/traps as it lands.

## What

Each page lists the pages that link to it, as Obsidian does: **below the article**, titles
linking back, with a count in "This page" anchored to the list. A page nothing links to
shows neither.

Why below, not a side panel: it answers "where next" when reading ends, and needs no
docking on phones — it's in the flow already. "Related by tag" (SPEC TBD) joins this block
later.

## How

- **Sync builds the graph** and writes `build/data/backlinks.json`, keyed by page; Hugo
  renders it server-side. No JS, no fetch, no pop-in. `index.json` gets at most a count.
  *Supersedes SPEC's "per-page fetch".*
- **Not in front matter** — sync edits that line by line (traps.md); a generated list there
  is the fragile case.
- **Extraction:** Markdown links to `.md`, relative paths resolved against the linking
  note, external URLs out. Skip code blocks and inline code by reusing `hashtags.py`'s
  protected-region ordering — not a second regex that gets it wrong.
- **Embeds** (`![](page.md)`) count, labelled "embedded in".
- **Search:** render outside `data-pagefind-body` (`page.html` puts it on the whole
  `<article>`), or `data-pagefind-ignore` — else every page matches its linkers' titles.

## Open

1. Links to unpublished or excluded pages (`publish: off`, `excludeFolders`): the target
   is gone, so no backlinks there; links *from* them must not count either.
2. Order: by title, or by date of the linking page?
3. A snippet of the linking sentence (Obsidian's "linked mentions"), or titles only?
   Titles first; a snippet means sync keeps context text.
4. Section index pages (`_index.md`) as targets and sources — same rules as pages?

## Tests

A linked-to fixture in `example/txt` (link, embed, a link inside code that must not
count); sync golden + site test for the rendered block and its Pagefind exclusion.
