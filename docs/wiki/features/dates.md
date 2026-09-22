---
covers:
  - scripts/dates.py
  - scripts/sync_content.py
  - layouts/_partials/page-date.html
  - layouts/_partials/recent.html
---

# Dates

Every page ends up with both `created` and `updated`; nothing is dated build time
unless there is nothing better *([D4](../decisions/D4.md))*. The rung used is
recorded as `created_source:` — read by no template, but it makes a bad inference
visible rather than silently wrong in a listing.

| `created`, best first | Source |
|---|---|
| `front-matter` | explicit `created:` (or legacy `date:`) |
| `path` | `YYYYMMDD` / `YYYY-MM-DD` in the stem, or `.../YYYY/MM/DD/` |
| `git` | first commit touching the file |
| `mtime` | birth time where the OS reports one, else mtime |
| `build` | last resort |
| `children` | generated section indexes: newest `updated` below them |

`updated`: explicit → last commit → mtime → build time, never earlier than `created`.
A section index whose `updated` was *inferred* takes its newest descendant's, so a
section reads as recent when its contents are. Legacy `date:`/`lastmod:` are renamed
in the copy only; `hugo.toml` maps `created`→`.Date`, `updated`→`.Lastmod`.

Display rule everywhere: show `created`, add "· updated *date*" only when `updated`
is more than a day later. Sorting is `sort . "Lastmod" "desc"` — a **stable** sort,
so pages from one commit keep a sensible order (`.ByLastmod.Reverse` was rejected: it
flips the tie-break too).
