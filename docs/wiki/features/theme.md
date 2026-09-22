---
covers:
  - layouts/baseof.html
  - layouts/page.html
  - layouts/_partials/head.html
  - layouts/_partials/sidebar.html
  - layouts/404.html
  - assets/css/main.css
---

# Theme & sidebar

A dark two-column shell: sticky header, sidebar, content, footer. Plain CSS through
Hugo's asset pipeline — no Sass, so the smaller non-extended Hugo binary works
([D9](../decisions/D9.md)).

## The shell

[baseof.html](../../../layouts/baseof.html) carries two attributes the JS depends on:

- `data-base` — `"/" | relURL`, so sub-path deployments resolve tag and Pagefind URLs.
- `data-index` — the fingerprinted `index.json` URL (see [browse lists](browse-lists.md)).

Then header (logo, site title with optional `params.shortTitle` for narrow screens, a
search form posting `?q=` to `/search/`), sidebar, `main` preceded by breadcrumbs,
footer. [page.html](../../../layouts/page.html) fills `main` for single pages: title,
Pagefind sort keys, type/date/tag chips, bookmark links, body in `data-pagefind-body`.

[head.html](../../../layouts/_partials/head.html) handles title, description, favicon
and the stylesheet — minified and fingerprinted with an SRI hash **in production
only**, so `hugo server` stays fast.

## Sidebar blocks

[sidebar.html](../../../layouts/_partials/sidebar.html):

1. **Sections** — in `sections.html` order, each with a page count, current one
   `.active`, plus a Search link. The Bookmarks count uses `bookmark-pages.html`.
2. **This page** — single pages only, not search: type (linked when a section page of
   that name exists), Created, Updated (same >1-day rule), bookmark chips, tag chips.
3. **Tags** — the cloud, top `params.tagCloudLimit`, heading links to `/tags/`.

Styling: [src/css.md](../src/css.md). Palette is CSS custom properties on `:root`, so
retuning needs no rule changes.

Not rendered anywhere: `author` and `source_repo` — carried in front matter, shown by
no template. See [docs/SPEC.md](../../SPEC.md).
