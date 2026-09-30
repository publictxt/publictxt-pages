# Traps

Cross-file invariants — each is otherwise documented only in a file you'd have to
already know to open. **Read before editing templates or the pipeline.**

## Pagefind drops pages silently — `build.py` fails the build instead

Every `data-pagefind-body` template **must** call `pagefind-keys.html` (now:
`page.html`, `section.html`). Pagefind drops a page lacking
the key it sorts on, or the filter selected — so a template without it vanishes from
sorted and filtered results, no error. Hence the rating sort key and filter are on
every page, rated or not. `check_search_index()` catches a page without them, and an
index count that differs from the body pages; `hugo server` builds skip it.

## Pairs that must change together

Display values (date labels, year, bookmark labels, recent order) are made once, in Hugo,
and reach JS as data: `index.json` for lists, Pagefind meta (`pagefind-keys.html`) for
search. Add one to both, or search cards go without it. What's still implemented twice:

| Server | Client |
|---|---|
| each list template's page collection (incl. the dataview hook) | its kind in `scope()` |
| stars in `page-meta.html` | `ratingHTML()` in `cards.js` |
| unrated sort value 2.5 in `pagefind-keys.html` | `UNRATED` in `sorts.js` |
| `created`'s `2006-01-…` form in `list-json.html` | `monthOf()` in `timeline.js` reads its digits |
| Pagefind `month` filter, `"2006-01"`, in `pagefind-keys.html` | `countsTree()` in `timeline.js`, `?year=&month=` → `month` in `search.js` |

A chip facet key (`BUILTIN` in `facets.js`, `chip-facets.html`) is the URL param **and** the Pagefind filter
name (`data-pagefind-filter` in the page templates, `pagefind-keys.html`); rename all
together.

A URL omits `-match` at the facet's default (`params.chipFacets` `match`, first
entry): change the default and shared links without it change meaning.

The Pagefind version is pinned in `build.py`; `search.js` is written against its JS
API, so a bump means checking search too.

Also: the breakpoints in `main.css` (1440px drawer, 900px one column) are repeated
in `layout.js`, JS's only copy.

## Three JS bundles, one `@params`

`js.Build` bundles each entry point (`list.js` from `list-container.html`, `search.js`
from `search.html`, `page-timeline.js` from `page-timeline.html`) with its imports, so
shared modules are **copied into each**. (`nav.js`, from `head.html`, is a fourth
bundle; it takes no `@params`.) Anything set per call — options, `params` — must match
across them, or lists, search and pages drift silently. Hence `js-params.html`, the one
source of `@params`.

## The right column is filled from both sides

A template's `{{ define "aside" }}` is its right column; none, no column. List filters
are JS-only: `section.html`/`term.html` emit an empty `[data-list-controls]` aside that
`list.js` claims and fills; search's filters are server-rendered in `search.html`'s aside.
Below 900px, `dock()` (`layout.js`) moves them into the page, and `main.css` hides the
aside by `:empty` — so these asides must hold no whitespace (`{{- -}}`) around their child.

## Search counts run higher than list counts

Pagefind also indexes section index bodies (`section.html`); browse lists hold regular
pages only. `category-counts.html` counts sections too, to match the search it links to.

## `partialCached` on site-scanning partials

`site-index.html`, `sections.html`, `collection-pages.html`, `category-counts.html`
walk every page; uncached, the build goes O(pages²).

## Build order and `public/`

`sync → hugo → pagefind`, each reading the last one's output. Remove
`public/` before `hugo` — it keeps stale pages. `build.py` does this.

## `fetch-depth: 0` in CI

Dates come from first/last commits; the default one-commit clone gives every page
the same date. Sync warns — check the log if dates look wrong.

## Front matter handling is not a YAML parser

Sync edits front matter line by line (`tags` in `hashtags.py`); nested or multi-line
keys are invisible. Swap in a real parser rather than extend the regexes.

## Hashtag regex alternation order is the logic

`HASHTAG_RE`: linkified tags, then protected regions (code, links, URLs), then bare
tags. Reordering changes every page's tags.

## Sync quirks

- `normalise_md` drops blank lines from existing front matter.
- `*.md` globs match folders too — bookmark domain folders (`sites/obsidian.md/`).
  Check `is_file()`.

## Search is unavailable under `hugo server`

The Pagefind index comes from a full build; the search page says so. `hugo server`
watches `build/content`, so content changes need sync re-run.

## Fingerprinting is production-only

`head.html`, `list-container.html`, `search.html`, `page-timeline.html`: fingerprint + `integrity` only when
`hugo.IsProduction`.

## Section links use folder names

Never the `_index.md` title (authors title freely) — `sidebar.html`, `sections.html`,
`crumb-label.html`. `humanize` would make `2023` "2023rd", so `crumb-label.html`
skips it for date folders.
