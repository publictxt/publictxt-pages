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
browsing defaults to newest. See [../traps.md](../traps.md) — a template
missing that partial disappears from sorted results.

The same facets as the browse lists, spelled the same way in the URL. Type, category
and year are exclusive; the category group is hidden when the index has none
([categories.md](categories.md)); an array of tags is Pagefind's AND. Year comes from
`pagefind-keys.html`'s `year[data-year]` and is a select above the tag chips, hidden
when the site spans one year; its options carry no counts, since Pagefind's are for
the current result set and would print "0" beside years that do have pages. Chip
counts run higher than a browse list's: Pagefind also indexes section index bodies,
which `index.json` does not carry.

The filter groups share one `<details>`, open by default. Below the 900px stacking
breakpoint `search.js` closes it, once at load, when nothing is selected, so the
results aren't pushed off a phone screen; that width is spelled in both `main.css` and
`search.js`, so change them together.

Results reuse the browse-list card with the `<mark>`ed excerpt as summary. No JS, or
no index yet, each get an explicit notice.
