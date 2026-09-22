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

An array of tags is Pagefind's AND. Results reuse the browse-list card with the
`<mark>`ed excerpt as summary. No JS, or no index yet, each get an explicit notice.
