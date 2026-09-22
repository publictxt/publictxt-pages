---
covers:
  - assets/js/search.js
  - layouts/search.html
  - layouts/_partials/pagefind-sort.html
  - site-content
---

# Search

Full-text search over the built site, plus tag/type browsing **with or without a
query**. Pagefind indexes `public/` after Hugo runs; the UI is custom
([D8](../decisions/D8.md)) because the stock one cannot run filter-only searches. The
search page lives in [site-content/](../../../site-content/) — it belongs to the site,
not to anyone's notes. Implementation: [src/js.md](../src/js.md).

## What is indexed

`data-pagefind-body` marks indexable content: the `<article>` on single pages, and
the **index body** of section pages. Nav, sidebar and the list below stay out.
Filters come from `data-pagefind-filter` — `type` (single), `tag` (multi, AND).
Dates reach results as `data-pagefind-meta` on the `<time>` elements in
[page-date.html](../../../layouts/_partials/page-date.html).

## Sorting

[pagefind-sort.html](../../../layouts/_partials/pagefind-sort.html) emits a hidden
empty element with three keys per page: both dates as **Unix seconds** (numeric
compare, offset-proof) and the title **lower-cased** (Pagefind compares strings
case-sensitively).

> **Trap:** every template with `data-pagefind-body` must include this partial.
> Pagefind drops pages lacking the key it sorts on — so a section index with body
> content would silently vanish from sorted results.

Sorting is Pagefind's own, so it orders the whole result set inside the index without
fetching a fragment per hit. A sort **replaces** relevance outright, with no
tiebreak — hence *Relevance* is only offered, and only the default, when there is a
query; filter-only browsing defaults to recently updated, like the browse lists. The
six other options come from [sorts.js](../src/js.md), so both UIs stay in step.

## Behaviour

- URL `/search/?q=…&tag=a&tag=b&type=wiki&sort=title`; `replaceState`, so typing
  doesn't spam history.
- The header search box on every page submits `?q=` here; a tag page deep-links
  `/search/?tag=<term>`, so combination is one click away.
- Chip counts reflect the result set; zero-count chips stay clickable.
- Results reuse the browse-list card, with Pagefind's `<mark>`ed excerpt as summary.

## Failure modes shown to the reader

- **No JavaScript** → `<noscript>` notice.
- **No index yet** → `#search-unavailable` explains that `hugo server` preview has no
  Pagefind index and a full build is needed. Normal during `--serve`; not a bug.
