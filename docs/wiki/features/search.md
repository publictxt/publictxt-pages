---
covers:
  - assets/js/search.js
  - layouts/search.html
  - layouts/_partials/pagefind-keys.html
---

# Search

Full-text plus tag/type browsing **with or without a query** — the reason for a
custom UI on Pagefind's JS API rather than its stock one, which cannot run
filter-only searches *([D8](../decisions/D8.md))*. The search page lives in
`site-content/`, not the content repo.

Sorting is Pagefind's own, over keys emitted by `pagefind-keys.html` (dates as Unix
seconds, title lower-cased). A sort **replaces** relevance outright with no tiebreak,
so *Relevance* is offered, and default, only when there is a query; filter-only
browsing defaults to recently updated. See [../traps.md](../traps.md) — a template
missing that partial disappears from sorted results.

The same three facets as the browse lists — type, year, tags — so a `?type=`,
`?year=` or `?tag=` URL means the same thing on either. Type and year are exclusive;
an array of tags is Pagefind's AND. The year is the `created` year, emitted per page
by `pagefind-keys.html` as a `year[data-year]` filter. Like the browse lists it is a
**select, not chips** — sitting above the tag list, hidden when the whole site spans
one year. Its options carry no counts: Pagefind's are for the current result set, so
a single-select control would print "0" beside years that do have pages, and unlike
the browse lists there is no second collection here to count honestly. Counts differ from a browse list's by design:
Pagefind also indexes section index bodies, which `index.json` (regular pages only)
does not carry.

Results reuse the browse-list card with the `<mark>`ed excerpt as summary. No JS, or
no index yet, each get an explicit notice.
