# Feature: reorganise panels and filters

Branch `feat/reorg-panels-and-filters`. **Proposed** — not built. Slices land in order;
each updates [SPEC.md](../SPEC.md), `docs/user/` and the wiki map/traps as it goes, and
this file shrinks to what's left.

## Why

Columns today mix jobs: the left holds site navigation (sections, categories, tag cloud);
the right holds page meta, filters *and* navigation (tree, timeline); section Contents
views put more navigation in the content. Results:

- **Too many ways to filter by date.** `/blog/` has two year/month rails — Contents in
  content (titles, labels filter via `?year=&month=`) and the list's timeline in the right
  column (counts, filters in place). See [issues.md](../wiki/issues.md).
- **Contents pushes results down**, worst on phones, where it sits above filters and list.
- **A third timeline implementation.** `timeline/content.html` re-does `timeline.js`'s
  grouping and markup in Hugo — the longest row in traps.md's pairs table — plus ~25 lines
  of `.contents` CSS undoing the shared look.
- **Two tag UIs** — sidebar cloud (site-wide, links) and the Tags filter (per list,
  filters) — that look alike and act differently.
- **No room reserved for backlinks** (SPEC TBD).

## Target

One job per column:

| Column | Job | Pages | Lists (section, tag, home) | Search |
|---|---|---|---|---|
| Header menu | where to go | sections, Tags, (categories) | same | same |
| Left | where am I | section tree or archive timeline | same, the section's | — |
| Main | what's shown | article, then Linked from *(reserved)* | index body, list | results |
| Right | about / refine this | This page (+ backlink count, *reserved*) | filters (incl. Tags), timeline filter, Other tags | filters |

Rules that fall out:

- **Chips that filter narrow this list; chips that link go to another list.** Never the
  same-looking chip doing both in one panel.
- **One filter rail, one navigation rail.** The right column's timeline filters; the left
  column's archive timeline navigates (titles; labels open/jump, never filter).
- **No section panel → the left shows the sections list** (home, search, tags, root pages),
  so the layout doesn't jump between kinds.
- **Backlinks are a separate feature** (`feat/backlinks`, `docs/features/backlinks.md`).
  This one only keeps their slot free: below the article, as in Obsidian, with a count in
  This page. Nothing in this reorg goes there.

## Slices

### A. Tags panel: filters on top, other tags below

On lists and search, the Tags filter becomes two tiers in one panel, headed **Tags**
(linked to `/tags/`), with a muted "click to filter" hint:

1. **Filterable here** — the existing facet: list counts, include/exclude, 20 then "more".
   Tooltip carries the site total: "3 here · 40 on the site".
2. Separator, **Other tags** — the site cloud *less the tier above*, linking to tag pages,
   site totals, weighted. No tag appears twice.

- Pages: no cloud (their own tags are header chips); Tags in the menu instead. *(Pushback
  on a site-wide cloud per page: identical everywhere = noise. Revisit if missed.)*
- No JS: tier 1 absent, tier 2 server-rendered links. Fine.
- Phones: tier 1 docks above results with the other filters (`dock()`); tier 2 stays in
  the aside, which falls *below* content in one column — "where else" after the results.
- Each filter section stays collapsible and remembered (`facets.js` folds). Tags starts
  shut on narrow screens.
- Unify `tagCloudLimit` (30) and the facet's `limit` (20).

Touches: `tag-cloud.html`, `list.js`/`search.js` (tier 1 → tier 2 exclusion),
`facets.js`, `search.html`/`section.html`/`term.html` asides, `main.css`, `sidebar.html`.
**Trap:** the right column is filled from both sides — the JS-filled
`[data-list-controls]` must stay whitespace-free for `:empty`; the cloud sits beside it,
not in it. The exclusion (tier 2 less tier 1) runs client-side over a server list: a new
server/client pair for traps.md.

Done when: one tag UI on lists and search; sidebar tag cloud gone or reduced to a link.

### B. Left column: tree / timeline; sections to a header menu

Thin first step: **wiki pages only** — `tree/aside.html` into the left column (no new
rendering; cached per folder), sections into a header menu. Judge at 1366px and on a phone
before going further.

Then:

- **Sections** get the left panel of their section (tree, or archive timeline), replacing
  the in-content Contents views (C).
- **Archive timeline, server-rendered**, as the tree is: rendered once per section
  (`partialCached`), each page's place marked in (as `tree/mark.html`). No JS, no
  `index.json` fetch, no pop-in — a late-filling nav column reads as broken.
  `page-timeline.js` stays only for `timelineCollections` chips and `timelineTags` chips —
  or those move to filters. *Open.*
- **Drawer breakpoint.** Below 1440px the left column is a hidden drawer — most laptops.
  Either lower it, or invert priority between 900–1440px: left stays, right folds into the
  page flow. *Must decide before B ships beyond wiki.*
- **Phones:** ☰ drawer holds menu (top) and tree/timeline (below) — the docs-site pattern.
- **Categories:** to the menu while few; else list filters only. Ties to SPEC's "remove
  category sidebar until category pages".

Touches: `baseof.html`, `sidebar.html`, `nav.js`, `layout.js` (+ breakpoints pair in
`main.css`), `page.html`, `section.html`, `tree/*`, `timeline/*`, `page-timeline.*`.
Supersedes SPEC's right-column `panels:` — it becomes a left-column choice.

### C. Retire in-content Contents

Lands with B, not before: `timeline/content.html` is the starting point for B's
server-rendered archive. Remove `.contents` CSS, `timelineSections` (or fold into
`panels:`), their tests and the traps pair row once nothing renders them.

## Baseline (current `public/`, 309 pages, 91 wiki)

| | |
|---|---|
| Wiki page tree (inline, per page) | 17.8 KB of 26.7 KB raw; ~2.6 of 5.1 KB gzip. Linear in wiki size (~200 B/row), re-sent every page |
| `index.json` | 74 KB raw, 17 KB gzip; fingerprinted, cached after first view |
| Contents | 13 KB `/blog/`, 17.8 KB `/wiki/` — above the list |

Moving the tree left doesn't change its bytes. If it grows painful: a fingerprinted tree
fragment per section, fetched and cached — at the cost of no-JS and pop-in.

## Open questions

1. Drawer breakpoint vs left-column priority (B).
2. Shared-timeline collection/tag chips: keep on the archive panel (JS), or move to filters?
3. Non-log timelines (wiki, notes) dated by `updated`? (SPEC TBD, now matters for the left
   archive.)
4. `panels:` — still per section, now naming the left panel (`tree` | `timeline` | none)?
