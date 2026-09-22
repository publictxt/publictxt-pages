---
covers:
  - scripts/dates.py
  - scripts/sync_content.py
  - layouts/_partials/page-date.html
  - layouts/_partials/recent.html
---

# Dates

Every page ends up with both `created` and `updated`. Nothing is dated "build time"
unless there is genuinely nothing better ([D4](../decisions/D4.md)). Resolver:
[src/dates.md](../src/dates.md).

## The `created` ladder

Most to least authoritative. The rung used is written as `created_source:` — diagnostic
only, read by no template, but it makes a bad inference visible instead of silently
wrong in a listing.

| Rung | Source |
|---|---|
| `front-matter` | explicit `created:` (or legacy `date:`) |
| `path` | `YYYYMMDD` or `YYYY-MM-DD` in the filename stem, or `.../YYYY/MM/DD/` |
| `git` | the **first** commit touching the file |
| `mtime` | birth time where the OS reports one, else mtime |
| `build` | the time of this build — last resort |
| `children` | generated section indexes only: newest `updated` among the folder's pages |

## The `updated` ladder

Explicit `updated:` (or legacy `lastmod:`) → last commit → mtime → build time. Two
corrections, both in [sync_content.py](../src/sync.md):

- `updated` is never earlier than `created`. An authored future `created:` (a
  scheduled post) wins.
- A **section index** whose `updated` was *inferred* takes the newest `updated` among
  its descendants when that is later — a section reads as recent when its contents
  are. An authored `updated:` is left alone.

`date:` → `created:` and `lastmod:` → `updated:` are renamed **in the copy** only, and
only when the new key is absent. [hugo.toml](../src/config.md) then maps `created` →
`.Date`, `updated` → `.Lastmod`.

## Display

One rule everywhere, so a page never reads "18 Sep" in one place and "Updated 18 Sep" in
another:

> Show `created`. Add "· updated <date>" **only** when `updated` is more than a day later.

Implemented three times, deliberately in step: `page-date.html`, `sidebar.html`, and
`dateHTML()` in `cards.js`. Format `2 Jan 2006` in all three. Changing the threshold
means changing all three.

## Sort order

`recent.html` is the one definition of "newest first": `sort . "Lastmod" "desc"`, a
**stable** sort over Hugo's default page order, so pages updated in the same commit keep
a sensible order. `.ByLastmod.Reverse` was rejected — `.Reverse` also flips the
tie-break, listing same-commit pages Z→A. `byUpdated()` in `site-index.js` mirrors it.

## CI trap

A shallow checkout (`fetch-depth: 1`, the `actions/checkout` default) has one commit, so
**every tracked file reports the same time at both ends** and the `git` rung collapses.
Sync warns when it sees one; [the workflow](../deploy.md) uses `fetch-depth: 0`.
