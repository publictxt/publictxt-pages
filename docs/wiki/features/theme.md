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

`.list-selects` groups the Sort and Year selects at the left of a browse list's
control head, so the Reset button stays pushed right by its `space-between`; the same
`.list-sort` select styling is reused for the Year control in the search sidebar,
where `.filter-group .list-sort` widens it to the column. See
[browse-lists.md](browse-lists.md) and [search.md](search.md).

Not rendered anywhere: `author` and `source_repo` — carried in front matter, shown by
no template. See [../../SPEC.md](../../SPEC.md).

Footer optionally renders `<a rel="me">` for `site.Params.mastodon` (hugo.toml),
which Mastodon's profile verification checks for on the linked site.
