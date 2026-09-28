---
covers:
  - layouts/_partials/source-urls.html
  - layouts/_partials/source-links.html
  - layouts/_partials/sidebar.html
  - layouts/page.html
  - hugo.toml
---

# Post sources

Where a page was also posted: `facebook:`, `mastodon:`, … — a URL or a list. Which
keys count, and their labels, is `[params.sources]` in `hugo.toml` (key → label);
unlisted keys pass through unread. `source-urls.html` is the only reader, returning
label + URL pairs A→Z by key; `source-links.html` renders them as "↗ Label" chips,
used in the page header and the sidebar's "Posted on" row.

Not in cards, index.json or search yet — no Source filter (SPEC: TBD).
