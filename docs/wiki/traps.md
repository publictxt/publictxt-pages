---
covers:
  - layouts
  - scripts
  - assets/js
---

# Traps

Cross-file invariants — each is otherwise documented only in a file you'd have to
already know to open. **Read before editing templates or the pipeline.**

## Pagefind drops pages silently

Every `data-pagefind-body` template **must** call `pagefind-keys.html` (now:
`page.html`, `section.html`, `bookmarks/section.html`). Pagefind drops a page lacking
the key it sorts on, or the filter selected — so a template without it vanishes from
sorted and filtered results, no error. Hence the rating sort key and filter are on
every page, rated or not.

## Pairs that must change together

Implemented twice, once server-side (no-JS render) and once in JS:

| Server | Client |
|---|---|
| `recent.html` order | `byUpdated()` in `site-index.js` |
| `page-date.html` >1-day rule (+ a third copy in `sidebar.html`) | `dateHTML()` in `cards.js` |
| `bookmark-label.html` | `bookmarkLabel()` in `cards.js` |
| each list template's page collection | its kind in `scope()` |
| `pagefind-keys.html`'s `data-year` | `yearOf()` in `list.js` |
| stars in `sidebar.html` | `ratingHTML()` in `cards.js` |
| unrated sort value 2.5 in `pagefind-keys.html` | `UNRATED` in `sorts.js` |

A `facets.js` key (`tag`, `category`) is the URL param **and** the Pagefind filter
name (`data-pagefind-filter` in the page templates, `pagefind-keys.html`); rename all
together.

Also: the 900px breakpoint in `main.css` is repeated as `matchMedia` in `list.js` and
`search.js`.

`yearOf()` slices the year off the RFC 3339 string: a local-zone `getFullYear()` would
disagree with Hugo's year for far-off readers.

## `partialCached` on site-scanning partials

`site-index.html`, `sections.html`, `bookmark-pages.html`, `category-counts.html`
walk every page; uncached, the build goes O(pages²).

## Build order and `public/`

`sync → hashtags → hugo → pagefind`, each reading the last one's output. Remove
`public/` before `hugo` — it keeps stale pages. See [build.md](build.md).

## `fetch-depth: 0` in CI

Dates come from first/last commits; the default one-commit clone gives every page
the same date. Sync warns — check the log if dates look wrong.

## Front matter handling is not a YAML parser

Both scripts edit front matter line by line; nested or multi-line keys are invisible.
Swap in a real parser rather than extend the regexes. `extract_hashtags.py` expects
bare `\n` — safe only because it runs on sync output.

## Hashtag regex alternation order is the logic

`HASHTAG_RE`: linkified tags, then protected regions (code, links, URLs), then bare
tags. Reordering changes every page's tags.

## Sync collisions and rewrites

- `index.md` and `home.md` in one folder both become `_index.md`; the later wins,
  silently.
- `linkify` runs **after** the index-link rewrite, which expects untouched links.
- `normalise_md` drops blank lines from existing front matter.
- `*.md` globs match folders too — bookmark domain folders (`sites/obsidian.md/`).
  Check `is_file()`.

## Search is unavailable under `hugo server`

The Pagefind index comes from a full build; the search page says so. `hugo server`
watches `build/content`, so content changes need sync re-run.

## Fingerprinting is production-only

`head.html`, `list-container.html`, `search.html`: fingerprint + `integrity` only when
`hugo.IsProduction`.

## Section links use folder names

Never the `_index.md` title (authors title freely) — `sidebar.html`, `sections.html`,
`crumb-label.html`. `humanize` would make `2023` "2023rd", so `crumb-label.html`
skips it for date folders.
