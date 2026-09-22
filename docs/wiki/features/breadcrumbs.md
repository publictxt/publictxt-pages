---
covers:
  - layouts/_partials/breadcrumbs.html
  - layouts/_partials/crumb-label.html
---

# Breadcrumbs

`baseof.html` renders the `.Ancestors` trail above `main` on every page but home, so
no template wires it up. It works only because sync gives every folder an
`_index.md` — see [sections.md](sections.md).

Section crumbs use the folder name, not the `_index.md` title *(same reason as
[sections.md](sections.md))*; `crumb-label.html` skips `humanize` for date folders,
since it would ordinalise `2023` into "2023rd".
