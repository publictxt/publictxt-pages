---
covers:
  - scripts/dates.py
  - scripts/sync_content.py
  - layouts/_partials/page-date.html
  - layouts/_partials/recent.html
---

# Dates

Every page ends up with both `created` and `updated`, whatever the source repo
provides. Nothing is dated "build time" unless there is genuinely nothing better
([D4](../decisions/D4.md)).

## The `created` ladder

Most to least authoritative. The rung used is written into the generated front
matter as `created_source:` — diagnostic only, no template reads it, but it makes
a bad inference visible instead of silently wrong in a listing.

| Rung | Source |
|---|---|
| `front-matter` | explicit `created:` (or legacy `date:`) |
| `path` | `YYYYMMDD` or `YYYY-MM-DD` in the filename stem, or `.../YYYY/MM/DD/` in the path |
| `git` | the **first** commit touching the file |
| `mtime` | birth time where the OS reports one (Windows, macOS, BSD), else mtime |
| `build` | the time of this build — last resort |
| `children` | generated section indexes only: the newest `updated` among the folder's pages |

Date-in-name matching guards against longer digit runs (IDs, ISBNs) and validates
the date, so `2023-Week50` and `Room 20240000` don't match. Renames are **not**
followed: a renamed file is "created" by the rename.

## The `updated` ladder

Explicit `updated:` (or legacy `lastmod:`) → last commit touching the file →
mtime → build time.

Two corrections on top:

- `updated` is never earlier than `created`. A file can't change before it was
  written; an authored future `created:` (a scheduled post) wins.
- A **section index** whose `updated` was *inferred* takes the newest `updated`
  among its descendants when that is later. A section reads as recent when its
  contents are — its landing page's own history says nothing useful. An authored
  `updated:` is left alone.

## Legacy keys

`date:` → `created:` and `lastmod:` → `updated:` are renamed **in the copy** only,
and only when the new key isn't already present. The source file is never touched.
`hugo.toml` then maps `created` → `.Date` and `updated` → `.Lastmod`.

## How dates are shown

One rule everywhere, so a page never reads "18 Sep" in one place and
"Updated 18 Sep" in another:

> Show `created`. Add "· updated <date>" **only** when `updated` is more than a
> day later.

Implemented three times, deliberately in step: `page-date.html` (server),
`sidebar.html` (the meta block), and `dateHTML()` in `cards.js` (client). Format
is `2 Jan 2006` in all three. Changing the threshold means changing all three.

## Sort order

`recent.html` is the one definition of "newest first" — `sort . "Lastmod" "desc"`,
a **stable** sort over Hugo's default page order, so pages updated in the same
commit keep a sensible order. `.ByLastmod.Reverse` was rejected: `.Reverse` also
flips the tie-break, listing same-commit pages Z→A. `byUpdated()` in
`site-index.js` mirrors this client-side.

## CI trap

A shallow checkout (`fetch-depth: 1`, the `actions/checkout` default) has one
commit, so **every tracked file reports the same time at both ends** and the `git`
rung collapses. The sync step prints a warning when it detects a shallow clone;
`deploy/publish-to-github-pages.yml` uses `fetch-depth: 0`.

## Where to look

`docs/wiki/src/dates.md` for the resolver, `docs/wiki/src/sync.md` for index
inheritance.
