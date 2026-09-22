---
covers:
  - layouts/_partials/breadcrumbs.html
  - layouts/_partials/crumb-label.html
  - layouts/baseof.html
---

# Breadcrumbs

A trail on every page but home, rendered by
[baseof.html](../../../layouts/baseof.html) above the main block, so it needs no
per-template wiring.

[breadcrumbs.html](../../../layouts/_partials/breadcrumbs.html) builds
`.Ancestors.Reverse | append .` — Hugo's own ancestry, which works only because the
sync step gives **every** folder an `_index.md` (see [sections](sections.md)).
Without that, nested wiki folders would be missing from the chain. The last item is
`<li aria-current="page">` with no link.

## Labels

[crumb-label.html](../../../layouts/_partials/crumb-label.html), by page kind:

| Kind | Label |
|---|---|
| home | `Home` |
| section | the **folder name** (`path.Base .Path`), humanized |
| taxonomy | the title, humanized |
| term | `#<term>` |
| anything else | the page title |

Sections use the folder name rather than the `_index.md` title because authors title
index pages freely ("wiki home") — the same rule the sidebar follows.

> **Date folders stay literal.** `humanize` ordinalises bare numbers, turning `2023`
> into "2023rd". A `^\d+$` check skips humanizing, so `blog/2023/12/17/` reads
> `Blog / 2023 / 12 / 17`.
