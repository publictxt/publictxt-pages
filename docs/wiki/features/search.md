---
covers:
  - assets/js/search.js
  - layouts/search.html
  - layouts/_partials/pagefind-sort.html
  - site-content
---

# Search

Full-text search over the built site, plus tag/type browsing that works **with or
without a query**. Pagefind indexes `public/` after Hugo runs; the UI is custom,
built on Pagefind's JS API rather than its stock UI ([D8](../decisions/D8.md)) —
the stock UI cannot run filter-only searches.

The search page itself lives in `site-content/`, not the content repo: it belongs
to the site, not to anyone's notes.

## What is indexed

`data-pagefind-body` marks indexable content: the `<article>` on single pages, and
the **index body** of section pages (a section index is real prose). Everything
else on the page — nav, sidebar, the list below — stays out.

Filters come from `data-pagefind-filter`: `type` (single-select) on the type chip,
`tag` (multi-select, AND) on each tag chip. Dates reach results as
`data-pagefind-meta` on the `<time>` elements in `page-date.html`.

## Sorting

`layouts/_partials/pagefind-sort.html` emits an empty hidden element carrying three
sort keys per page: both dates as **Unix seconds** (numeric compare, offset-proof)
and the title **lower-cased** (Pagefind compares strings case-sensitively).

> **Trap:** every template with `data-pagefind-body` must include this partial.
> Pagefind drops pages that lack the key it is sorting on — so a section index
> with body content would silently vanish from sorted results.

Sorting is Pagefind's own, so it orders the whole result set inside the index
without fetching a fragment per hit. A sort **replaces** relevance ranking
outright, with no tiebreak — which is why *Relevance* is only offered, and only
the default, when there is a query. Filter-only browsing defaults to recently
updated, matching the browse lists.

The six non-relevance options are imported from `sorts.js`, so search and the
browse lists always offer the same set and the same `?sort=` spellings.

## Behaviour

- URL: `/search/?q=…&tag=a&tag=b&type=wiki&sort=title`, kept via `replaceState`
  (no history spam while typing); `popstate` re-reads it.
- The header search box on every page submits `?q=` here.
- A tag page deep-links "search within them" as `/search/?tag=<term>`, so tag
  combination is one click away.
- Query input is debounced 200 ms. Results render 20 at a time behind *Show more*.
- Counts on chips reflect the current result set; zero-count chips get `.empty`
  but stay clickable.
- Results reuse the browse-list card (`cards.js`), with Pagefind's `<mark>`ed
  excerpt as the summary.

## Failure modes shown to the reader

- **No JavaScript** → `<noscript>` notice.
- **No index yet** → `#search-unavailable` explains that `hugo server` live
  preview has no Pagefind index and a full build is needed. This is the normal
  state during `--serve`; not a bug.

## Where to look

`docs/wiki/src/js.md` (search.js), `docs/wiki/src/layouts.md` (search.html,
pagefind-sort.html), `docs/wiki/build.md` (why Pagefind must run last).
