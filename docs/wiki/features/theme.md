---
covers:
  - layouts/baseof.html
  - layouts/_partials/head.html
  - layouts/_partials/sidebar.html
  - layouts/404.html
  - layouts/page.html
  - assets/css/main.css
---

# Theme & sidebar

A dark, two-column shell: sticky header, sidebar, content, footer. Plain CSS via
Hugo's asset pipeline — no Sass, so the smaller non-extended Hugo binary works
([D9](../decisions/D9.md)).

## The shell

`baseof.html` carries two data attributes the JS depends on:

- `data-base` — `"/" | relURL`, so sub-path deployments resolve tag and Pagefind
  URLs correctly.
- `data-index` — the fingerprinted `index.json` URL (see [browse lists](browse-lists.md)).

Then: header (logo, site title with an optional `params.shortTitle` for narrow
screens, a search form posting `?q=` to `/search/`), sidebar, `{{ block "main" }}`
preceded by breadcrumbs, footer.

`head.html` handles title, description, favicon (absolute path or relURL) and the
stylesheet — minified and fingerprinted with an SRI integrity hash in production
only, so `hugo server` stays fast.

## Sidebar blocks

1. **Sections** — `sections.html` order, each with a page count, current section
   marked `.active`; plus a Search link. The Bookmarks count uses
   `bookmark-pages.html`.
2. **This page** — single pages only, not search: type (linked when a section page
   of that name exists), Created, Updated (same >1-day rule as everywhere), bookmark
   chips, tag chips.
3. **Tags** — the cloud, top `params.tagCloudLimit`, heading links to `/tags/`.

## CSS

One file, `assets/css/main.css`, ~590 lines, sectioned by comment banner: tokens →
header → layout → sidebar → chips & tag cloud → home → breadcrumbs → lists →
browse lists → single page → search → responsive.

The palette is CSS custom properties on `:root` (`--bg`, `--accent`,
`--sidebar-width`, `--content-max`, …) so it can be retuned without touching
rules. Inline hashtags are styled by attribute selector on their `/tags/` href
rather than a class, since the sync step emits plain Markdown links.

Not currently rendered anywhere: `author` and `source_repo`. They are carried
through front matter but no template shows them — see `docs/SPEC.md`.
