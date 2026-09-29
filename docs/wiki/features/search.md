---
covers:
  - assets/js/search.js
  - layouts/search.html
  - layouts/_partials/pagefind-keys.html
  - layouts/_partials/rating.html
---

# Search

Full-text plus facets **with or without a query** — hence a custom UI on Pagefind's JS
API, whose stock UI can't search filters alone *([D8](../decisions/D8.md))*. The page
lives in `site-content/`.

Sorts are Pagefind's, over `pagefind-keys.html`'s keys, and **replace** relevance
with no tiebreak: *Relevance* is offered (and default) only with a query.

Same facets and URL spelling as the browse lists. Collection, category and tag are
[filter chips](filter-chips.md) (the intro only says "hover for the next click": `states` vary); year and rating single-select. Pagefind gets the chips
as a compound `all: [...]`; a facet matching *any* counts from a second search.

A chip facet hides when the index has none (categories when disabled); year when the site spans one year; rating
when nothing is rated. Selects show no counts — Pagefind's are per result set. Chip
counts run higher than a browse list's: Pagefind also indexes section index bodies.

Typing waits 400 ms (`TYPING_MS`; Enter doesn't); a superseded run's results are dropped.

Filters fold on narrow screens when nothing is selected. No JS, or no index yet,
each get a notice.
