---
covers:
  - layouts/baseof.html
  - assets/css/main.css
---

# Theme

A dark two-column shell: sticky header with search, sidebar (sections, page meta,
tag cloud), content, footer. `baseof.html` carries `data-base` (sub-path
deployments) and `data-index`. Plain CSS with `:root` custom properties, no Sass, so
the non-extended Hugo binary works *([D9](../decisions/D9.md))*.

Not rendered anywhere: `author` and `source_repo` — carried in front matter, shown by
no template. See [../../SPEC.md](../../SPEC.md).
