---
covers:
  - scripts
  - layouts
  - assets
  - hugo.toml
  - deploy
---

# Source Wiki

Read before the source, to find the right files; then read those — every script
has a docstring, every partial a `{{/* */}}` contract. The wiki holds only what no
single file can: where things are, and what spans files. Code wins any disagreement.

| Page | For |
|---|---|
| this one | the map: every file, one line |
| [features/](features/index.md) | a capability and the files that do it |
| [traps.md](traps.md) | cross-file invariants. **Read before editing templates or the pipeline.** |
| [build.md](build.md) · [deploy.md](deploy.md) | running and shipping |
| [decisions/](decisions/DECISIONS.md) | why, cited as *(Dn)* |

[SPEC.md](../SPEC.md) is what the site *should* do, including **(TBD)** items.

**Change code and its wiki page in the same commit**; `python scripts/wiki_lint.py`
flags pages that fell behind and files missing from the map.

## Map

### Python — pipeline (no dependencies; 3.10+)

```txt
scripts/sync_content.py     source repo -> build/content: renames, titles, dates,
                            linkify, source_path, skips (incl. `publish: off`)
scripts/dates.py            created/updated ladders, one git log pass, sort_key
scripts/hashtags.py         HASHTAG_RE, find_hashtags, linkify — used by both scripts
scripts/extract_hashtags.py body hashtags -> front matter `tags`
scripts/build.sh            full pipeline, POSIX       -> build.md
scripts/build.ps1           full pipeline, PowerShell  -> build.md
scripts/wiki_lint.py        staleness check for this wiki
```

### Templates

```txt
layouts/baseof.html               shell; data-base + data-index on <html>
layouts/home.html                 hero, section cards, compact Recent list
layouts/page.html                 single page; data-pagefind-body
layouts/section.html              index body as prose + browse list
layouts/term.html                 /tags/<term>/
layouts/taxonomy.html             /tags/
layouts/search.html               search UI shell; search.js fills it
layouts/404.html
layouts/bookmarks/section.html    section.html + the gathered bookmarks

layouts/_partials/
  head.html             title, description, favicon, Mastodon rel="me", stylesheet
  sidebar.html          sections / page meta / tag cloud
  breadcrumbs.html      .Ancestors trail
  footer.html           [params.footer] wording; edit-in-repo link
  crumb-label.html      one crumb's label; date folders literal
  sections.html         top-level sections in sectionOrder   (partialCached)
  recent.html           the one "recently updated first"
  page-date.html        created, + updated when >1 day later
  tag-cloud.html        weighted term chips
  site-index.html       publishes index.json, returns URL    (partialCached)
  list-json.html        pages -> index.json items
  list-container.html   [data-list] + no-JS <ul> + loads list.js
  list-order.html       order: cascade (page -> ancestors -> param)
  list-per-page.html    perPage: cascade
  pagefind-keys.html    hidden sort keys + filters — see traps.md
  bookmark-urls.html    only reader of bookmark:/bookmarks:
  bookmark-pages.html   every page with a bookmark URL  (partialCached)
  bookmark-links.html   the chip row
  bookmark-label.html   one URL's short form
  category.html         only reader of category:
  rating.html           only reader of rating:

layouts/_markup/
  render-image.html     YouTube URL -> iframe, else plain <img>
```

### Browser

```txt
assets/js/site-index.js   fetch index.json once per document; scope() subsets
assets/js/sorts.js        the sort vocabulary, ?sort= spellings
assets/js/cards.js        the one card renderer; rating filter value
assets/js/list.js         browse list: state<->URL, facets, paging
assets/js/search.js       Pagefind UI: filters, sort, incremental results
assets/css/main.css       the whole theme; palette in :root
```

ES modules bundled per entry point by Hugo's built-in esbuild — no Node to build.

### Config and delivery

```txt
hugo.toml                            mounts, front matter mapping, params
deploy/publish-to-github-pages.yml   template for the CONTENT repo -> deploy.md
site-content/                        site-owned pages (search)
example/txt/                         synthetic default source repo
static/                              favicons, logo
```

**Generated, never edit** (gitignored): `build/content/`, `public/`, `resources/_gen/`.
