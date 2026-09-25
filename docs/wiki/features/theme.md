---
covers:
  - layouts/baseof.html
  - layouts/_partials/footer.html
  - layouts/_partials/head.html
  - assets/css/main.css
---

# Theme

Dark two-column shell: sticky header with search, sidebar (sections, page meta, tag
cloud), content, footer. Plain CSS with `:root` properties, no Sass
*([D9](../decisions/D9.md))*. `baseof.html` carries `data-base` (sub-path deploys) and
`data-index`.

In `main.css`: `.list-selects` holds the Sort / Year / Rating selects, and
`.filter-group .list-sort` reuses them full width in search; `.fold` is the
collapsible `<details>` for list controls and search filters; `.rating` colours the
stars.

**Edit this page** = `params.editURL` + the page's `source_path` (sync writes it,
since renames make Hugo's path wrong). None on generated indexes or `site-content/`
pages, or when `editURL` is empty; the deploy workflow sets it
([../deploy.md](../deploy.md)). Footer wording is `[params.footer]`.

`author` and `source_repo` are carried in front matter but rendered nowhere.
