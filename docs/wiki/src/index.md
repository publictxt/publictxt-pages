---
covers:
  - scripts
  - layouts
  - assets
  - hugo.toml
  - deploy
---

# Source

One line per file; the per-subsystem pages carry the contracts. Start from a
[feature](../features/index.md) page if you know *what* you're changing, not *where*.

## Python — [sync](sync.md) · [dates](dates.md) · [hashtags](hashtags.md)

```txt
sync_content.py     278  source repo -> build/content: index renames, titles, dates, linkify, skips
dates.py            179  DateResolver: created/updated ladders, git log, sort_key
hashtags.py          67  HASHTAG_RE — the one definition; find_hashtags, linkify
extract_hashtags.py 132  merge body hashtags into front matter `tags`
build.sh / build.ps1     full pipeline                    -> ../build.md
wiki_lint.py             staleness check for this wiki    -> ../index.md
```

No third-party dependencies — PyYAML deliberately avoided. Python 3.10+ (`X | None`,
walrus). Files: [scripts/](../../../scripts/).

## Templates — [layouts](layouts.md)

```txt
baseof.html               page shell; data-base + data-index live here
home.html                 hero, section cards, compact Recent list
page.html                 single page; data-pagefind-body
section.html              section header + prose body + browse list
term.html  /tags/<term>/        taxonomy.html  /tags/
search.html               search UI shell + search.js       404.html
bookmarks/section.html    section.html with the gathered bookmark collection

_partials/
  head.html             title, description, favicon, stylesheet
  sidebar.html          sections / page meta / tag cloud
  breadcrumbs.html      .Ancestors trail    crumb-label.html  one crumb's label
  sections.html         top-level sections in sectionOrder
  recent.html           the one "newest first" (stable sort, Lastmod desc)
  page-date.html        created, + updated when >1 day later
  tag-cloud.html        weighted term chips
  site-index.html       builds+publishes index.json, returns its URL
  list-json.html        page collection -> index.json item array
  list-container.html   [data-list] + no-JS <ul> + loads list.js
  list-order.html       order: cascade     list-per-page.html  perPage: cascade
  pagefind-sort.html    hidden sort keys; REQUIRED wherever data-pagefind-body is
  bookmark-urls.html    bookmark:/bookmarks: -> URLs; only reader of those keys
  bookmark-pages.html   bookmarks/ subtree + every page with a bookmark URL
  bookmark-links.html   the chip row       bookmark-label.html  one URL's label
```

Files: [layouts/](../../../layouts/).

## Browser — [js](js.md) · [css](css.md)

```txt
site-index.js   58  fetch index.json once per document; scope() subsets
sorts.js        34  the six sorts, ?sort= spellings, normalise/parse
cards.js        70  the one card renderer; date, tag, bookmark formatting
list.js        245  browse list: state<->URL, facets, paging, render
search.js      155  Pagefind UI: filters, sort, incremental results
main.css       594  the whole theme
```

ES modules, bundled per entry point by `js.Build` (esbuild, inside Hugo — no Node
needed for the build). Entry points: `list.js`, `search.js`. Files:
[assets/](../../../assets/).

## Config and delivery

```txt
hugo.toml                          -> config.md
deploy/publish-to-github-pages.yml -> ../deploy.md
site-content/                      site-owned pages (the search page)
example/txt/                       synthetic default source repo
static/                            favicons, logo
```

**Generated, never edit:** `build/content/` (sync output), `public/` (Hugo +
Pagefind), `resources/_gen/` (asset cache). All gitignored.
