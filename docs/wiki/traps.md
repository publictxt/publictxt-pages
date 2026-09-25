---
covers:
  - layouts
  - scripts
  - assets/js
---

# Traps

Things that bite, collected here because each is documented only in the one file you
would have to already know to open. **Read before editing templates or the pipeline.**

## Pagefind drops pages silently

Every template carrying `data-pagefind-body` **must** also call `pagefind-keys.html`.
Pagefind drops any page lacking the key it is sorting on, so a new template without it
vanishes from sorted results with no error; the same span carries the `year` and
`category` filters, so it also vanishes whenever either is selected. Currently `page.html`, `section.html` and
`bookmarks/section.html`.

## Client/server pairs must change together

Each of these is implemented twice — once in a template for the no-JS render, once in
JS for the live one. Changing one alone makes the two views disagree:

| Server | Client |
|---|---|
| `recent.html` (newest-first order) | `byUpdated()` in `site-index.js` |
| `page-date.html` (>1-day updated rule) | `dateHTML()` in `cards.js` |
| `bookmark-label.html` (URL display form) | `bookmarkLabel()` in `cards.js` |
| the page collection each list template passes | the matching kind in `scope()` |
| `pagefind-keys.html`'s `data-year` (`.Date`) | `yearOf()` in `list.js` |

The >1-day date rule is implemented a **third** time, in `sidebar.html`.

Not server/client, same hazard: the 900px stacking breakpoint in `main.css` is repeated
as a `matchMedia` query in `search.js` and `list.js`, which fold the filters on narrow
screens.

`yearOf()` slices the year out of the RFC 3339 string rather than building a `Date`: a
local-zone `getFullYear()` would disagree with the year Hugo baked into the Pagefind
filter, for readers far enough from the site's zone.

## `partialCached` on site-scanning partials

`site-index.html`, `sections.html` and `bookmark-pages.html` walk every page in the
site and return the same value for all of them. Called uncached, each makes the build
O(pages squared).

## Build order is mandatory

`sync → hashtags → hugo → pagefind`. Each step consumes the previous one's output.
Also: `public/` must be **removed** before `hugo` — Hugo does not delete stale pages
from a previous build. See [build.md](build.md).

## `fetch-depth: 0` in CI

Page dates come from the first and last commit touching a file. The
`actions/checkout` default is a one-commit shallow clone, which makes every page
report the same date at both ends. Sync warns on stderr when it sees one — check the
build log if dates look wrong.

## The front matter handling is not a YAML parser

`sync_content.py` and `extract_hashtags.py` manipulate front matter line by line.
Keys inside nested structures or multi-line scalars are invisible to them. Deliberate
— swap in a real parser rather than extending the regexes.

Related: `extract_hashtags.py`'s front matter regex requires bare `\n`, unlike
`sync_content.py`'s. Safe only because it runs on sync output, never a raw repo.

## Hashtag regex alternation order is the logic

`HASHTAG_RE` matches already-linkified tags first, then protected regions (code,
links, URLs), then bare tags. Reordering the alternatives changes what every page in
the site is tagged with.

## Sync collisions and rewrites

- `index.md` and `home.md` in one folder both map to `_index.md`; the later in sort
  order wins silently.
- `linkify` runs **after** the index-link rewrite, which expects untouched destinations.
- `normalise_md` drops blank lines from existing front matter.

## Search is unavailable under `hugo server`

Pagefind's index is written into `public/` by a full build; live preview has none.
The search page says so rather than failing silently — normal during `--serve`, not a
bug. Content changes also need the sync steps re-run: `hugo server` watches
`build/content`, not the source repo.

## Fingerprinting is production-only

`head.html`, `list-container.html` and `search.html` all follow `resources.Get` →
transform → fingerprint *only when* `hugo.IsProduction` → emit with `integrity`. A
dev build deliberately skips it.

## Section links use folder names

Never the `_index.md` title — authors title index pages freely ("wiki home").
`sidebar.html`, `sections.html` and `crumb-label.html` all rely on this. `humanize`
ordinalises bare numbers, so `crumb-label.html` skips it for date folders or `2023`
renders as "2023rd".
