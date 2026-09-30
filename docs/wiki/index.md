# Map

Every source file, one line — to find the right files, then read those: every script
has a docstring, every partial a `{{/* */}}` contract. Code wins any disagreement.
[traps.md](traps.md) holds what spans files; **read it before editing templates or the
pipeline.** [SPEC.md](../SPEC.md) is what the site *should* do.

Add, move or remove a file: update this map. `python scripts/map_lint.py` checks both ways.

## Python — pipeline (no dependencies; 3.10+)

Hugo never reads the source repo — only what sync writes: `build/content/`, `build/site.toml`.

```txt
scripts/sync_content.py     source repo -> build/content: titles, dates,
                            hashtags, source_path, skips (incl. `publish: off`)
scripts/dates.py            created/updated ladders, one git log pass, sort_key
scripts/hashtags.py         HASHTAG_RE; linkify (body), merge_tags (front matter `tags`)
scripts/build.py            full pipeline, any OS, + search index check; docstring has usage
scripts/build.sh            shim -> build.py, for deploy workflows copied before it
scripts/map_lint.py         this map vs the tree
```

## Tests — `python -m unittest` (stdlib), `node --test "tests/js/*.test.mjs"`

```txt
tests/test_golden.py        example/txt through sync vs tests/golden/;
                            docstring: refreshing the snapshot
tests/test_dates.py         the date ladder, which the golden test fixes
tests/test_site.py          that content through Hugo: index.json vs tests/golden/ (needs hugo)
tests/test_build.py         build.py's search index check, on made-up public/ trees
tests/js/facets.test.mjs    facets.js + sorts.js: URL spelling, chip presses, lists = search
tests/js/timeline.test.mjs  timeline.js: year/month grouping, ?month= spelling
```

## Templates

```txt
layouts/baseof.html               shell: header + ☰, nav | main | "aside" block;
                                  data-base + data-index on <html>
layouts/home.html                 hero, section cards, Recent list; aside: its filters
layouts/page.html                 single page; data-pagefind-body; aside: page meta
layouts/section.html              index body as prose + browse list; aside: its filters
layouts/term.html                 /tags/<term>/; aside: its filters
layouts/taxonomy.html             /tags/
layouts/search.html               search UI shell, filters in its aside; search.js fills it
layouts/404.html

layouts/_partials/
  head.html             title, description, favicon, Mastodon rel="me", stylesheet, nav.js
  sidebar.html          left nav: sections / categories / tag cloud
  page-meta.html        "This page": a page's meta, in its right column
  breadcrumbs.html      .Ancestors trail
  footer.html           [params.footer] wording; edit-in-repo link
  crumb-label.html      one crumb's label; date folders literal
  sections.html         top-level sections in sectionOrder   (partialCached)
  recent.html           the one "recently updated first"
  page-date.html        created, + updated when shown
  date-labels.html      the one date form + >1-day rule, for page, sidebar, JSON, Pagefind
  tag-cloud.html        weighted term chips
  site-index.html       publishes index.json, returns URL    (partialCached)
  list-json.html        pages -> index.json items, with Hugo-made display values
  list-container.html   [data-list] + no-JS <ul> + loads list.js
  js-params.html        @params for every js.Build — see traps.md
  chip-facets.html      only reader of params.chipFacets   (partialCached)
  list-order.html       order: cascade (page -> ancestors -> param)
  list-per-page.html    perPage: cascade
  pagefind-keys.html    hidden sort keys + filters — see traps.md
  bookmark-urls.html    only reader of bookmark:/bookmarks:
  bookmark-links.html   the chip row
  page-collections.html only reader of collections:; + section, "bookmarks" if URL
  collection-pages.html every page of a collection        (partialCached)
  section-pages.html    what a section lists, + its scope
  bookmark-label.html   one URL's short form (returns it)
  source-urls.html      only reader of params.sources keys (facebook:, …)
  source-links.html     "Posted on" chips
  categories.html       only reader of categories:/category:
  category-counts.html  used categories + counts, for the sidebar (partialCached)
  rating.html           only reader of rating:
  note-embed.html       ![](page.md) -> the page's content boxed; inline/unresolved -> link
  attachment-url.html   relative file path -> its URL: beside the note, or a top-level folder (returns it)

layouts/_markup/
  render-image.html     every ![](…): .md -> note-embed; YouTube -> iframe; audio -> <audio>; else <img>
  render-codeblock-dataview.html  ```dataview LIST FROM #tag -> compact list, else code
```

## Browser

```txt
assets/js/site-index.js   fetch index.json (recent-first) once per document; scope() subsets
assets/js/layout.js       breakpoints for JS; dock(): filters right column <-> page flow
assets/js/nav.js          ☰: collapse the nav (wide), drawer (narrower); blocking, in <head>
assets/js/sorts.js        the sort vocabulary, ?sort= spellings
assets/js/cards.js        the one card renderer; rating filter value
assets/js/facets.js       chip facets from config; include, exclude, match any/all; rating
                          chips; remembered section folds — shared by lists and search
assets/js/list.js         browse list: state<->URL, facets, paging
assets/js/timeline.js     browse list's timeline panel: pages by year/month, picks the date filter
assets/js/search.js       Pagefind UI: filters, sort, incremental results
assets/css/main.css       the whole theme; palette + column widths in :root
```

ES modules bundled per entry point (list.js, search.js; nav.js as a classic script) by
Hugo's built-in esbuild — no Node to build. One sort vocabulary, one card and one facet
module serve lists and search; see traps.md.

## Config and delivery

```txt
hugo.toml                            mounts, front matter mapping, params
deploy/publish-to-github-pages.yml   template for the CONTENT repo; header has setup
.github/workflows/test.yml           tests + map_lint on push and PR
site-content/                        site-owned pages (search)
example/txt/                         default source repo + golden-test fixture;
                                     its README maps case -> file
static/                              favicons, logo
```

**Generated, never edit** (gitignored): `build/content/`, `public/`, `resources/_gen/`.
