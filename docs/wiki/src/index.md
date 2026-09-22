---
covers:
  - scripts
  - layouts
  - assets
  - hugo.toml
  - deploy
---

# Source

The annotated tree. One line per file; the per-subsystem pages carry the contracts.
Start from a [feature](../features/index.md) page if you know *what* you're
changing and not *where*.

## Python preprocessing — [src/sync.md](sync.md), [dates.md](dates.md), [hashtags.md](hashtags.md)

```txt
scripts/sync_content.py     278  source repo -> build/content: index renames, titles, dates, linkify, skips
scripts/dates.py            179  DateResolver: the created/updated ladders, git log, sort_key
scripts/hashtags.py          67  HASHTAG_RE — the one definition of a hashtag; find_hashtags, linkify
scripts/extract_hashtags.py 132  merge body hashtags into front matter `tags`
scripts/build.sh             99  full pipeline, POSIX            -> ../build.md
scripts/build.ps1            40  full pipeline, PowerShell       -> ../build.md
scripts/wiki_lint.py          -  staleness check for this wiki   -> ../index.md
```

No third-party dependencies anywhere — PyYAML deliberately avoided. Python 3.10+
(uses `X | None` and the walrus operator).

## Templates — [src/layouts.md](layouts.md)

```txt
layouts/baseof.html               page shell; data-base + data-index live here
layouts/home.html                 hero, section cards, compact Recent list
layouts/page.html                 single page; data-pagefind-body
layouts/section.html              section header + prose body + browse list
layouts/term.html                 /tags/<term>/
layouts/taxonomy.html             /tags/
layouts/search.html               search UI shell + search.js
layouts/404.html                  not found
layouts/bookmarks/section.html    section.html with the gathered bookmark collection

layouts/_partials/
  head.html               title, description, favicon, stylesheet
  sidebar.html            sections / page meta / tag cloud
  breadcrumbs.html        .Ancestors trail
  crumb-label.html        one crumb's short label
  sections.html           top-level sections in sectionOrder
  recent.html             the one "newest first" (stable sort on Lastmod desc)
  page-date.html          created, + updated when >1 day later
  tag-cloud.html          weighted term chips
  site-index.html         builds+publishes index.json, returns its URL
  list-json.html          page collection -> index.json item array
  list-container.html     [data-list] + no-JS <ul> + loads list.js
  list-order.html         order: cascade (page -> ancestors -> site param)
  list-per-page.html      perPage: cascade, same shape
  pagefind-sort.html      hidden sort keys; REQUIRED wherever data-pagefind-body is
  bookmark-urls.html      bookmark:/bookmarks: -> []string; the only reader of those keys
  bookmark-pages.html     bookmarks/ subtree + every page with a bookmark URL
  bookmark-links.html     the chip row
  bookmark-label.html     display form of one URL
```

## Browser — [src/js.md](js.md), [css.md](css.md)

```txt
assets/js/site-index.js   58  fetch index.json once per document; scope() subsets
assets/js/sorts.js        34  the six sorts, ?sort= spellings, normalise/parse
assets/js/cards.js        70  the one card renderer; date, tag and bookmark formatting
assets/js/list.js        245  browse list: state<->URL, facets, paging, render
assets/js/search.js      155  Pagefind UI: filters, sort, incremental results
assets/css/main.css      594  the whole theme
```

ES modules, bundled per entry point by `js.Build` (esbuild, bundled with Hugo — no
Node needed for the build itself). Entry points are `list.js` and `search.js`.

## Config and delivery

```txt
hugo.toml                          -> src/config.md
deploy/publish-to-github-pages.yml -> ../deploy.md
site-content/                      site-owned pages (the search page)
example/txt/                       synthetic default source repo
static/                            favicons, logo
```

## Generated — never edit

```txt
build/content/   sync output, wiped every build
public/          Hugo output + Pagefind index, wiped every build
resources/_gen/  Hugo asset cache
```
