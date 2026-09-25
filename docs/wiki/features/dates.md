---
covers:
  - scripts/dates.py
  - scripts/sync_content.py
  - layouts/_partials/page-date.html
  - layouts/_partials/recent.html
---

# Dates

Every page gets both `created` and `updated`, from the ladders in `dates.py`;
build time only as a last resort *([D4](../decisions/D4.md))*. `created_source:`
records the rung, so a bad inference shows in the generated front matter. Generated
section indexes use `children`: their newest page's `updated`.

`updated` is never earlier than `created`. A section index whose `updated` was
inferred takes its newest descendant's (`inherit_index_dates`). `hugo.toml` maps
`created`→`.Date`, `updated`→`.Lastmod`.

Ladders run on the **source** path, so sync's renames never change a page's dates.

Display: `created`, plus "· updated" only when >1 day later — implemented three
times ([../traps.md](../traps.md)). "Recently updated" order is `recent.html`.
