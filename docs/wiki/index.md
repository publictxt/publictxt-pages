---
covers:
  - scripts
  - layouts
  - assets
  - hugo.toml
  - deploy
---

# Source Wiki

How this repo works, for reading **before** the source. Four pages:

| Page | Use it for |
|---|---|
| this one | where every file is — the map below |
| [features/](features/index.md) | what a capability does and which files do it, one page each |
| [traps.md](traps.md) | what will bite you. **Read before editing templates or the pipeline.** |
| [build.md](build.md) · [deploy.md](deploy.md) | running and shipping it |
| [decisions/](decisions/DECISIONS.md) | why, one record per decision, cited as *(Dn)* |

[docs/SPEC.md](../SPEC.md) says what the site *should* do, including unbuilt **(TBD)**
items. This wiki describes only what exists.

**The source is well commented — prefer it over this wiki for any single file.** Every
script has a module docstring, every partial a `{{/* */}}` contract comment. This wiki
exists for what no single file can tell you: where things are, and what spans files.
If a page contradicts the code, the code wins and the page is a bug.

## Rules

- Each page's `covers:` front matter names real paths; `python scripts/wiki_lint.py`
  flags pages whose covered files moved on without them, and files missing from the
  map below. Exits non-zero, so it drops into CI or a pre-commit hook.
- **Change code and its wiki page in the same commit.**
- A *file* in `covers:` means "describes what is in it" — stale on any edit. A
  *directory* means "describes the set of files here" — stale only on add or remove.

## Map

### Python — pipeline

```txt
scripts/sync_content.py     347  source repo -> build/content: index renames, titles,
                                 dates, hashtag linkify, source_path, skips (incl.
                                 `publish: off`). Never
                                 touches source.
scripts/dates.py            179  DateResolver: created/updated ladders, one git log
                                 pass, sort_key. Imported by sync_content.
scripts/hashtags.py          67  HASHTAG_RE — the one definition of a hashtag;
                                 find_hashtags, linkify. Imported by both scripts.
scripts/extract_hashtags.py 132  merge body hashtags into front matter `tags`
scripts/build.sh             99  full pipeline, POSIX        -> build.md
scripts/build.ps1            40  full pipeline, PowerShell   -> build.md
scripts/wiki_lint.py             staleness check for this wiki
```

No third-party dependencies — PyYAML deliberately avoided. Python 3.10+.

### Templates

```txt
layouts/baseof.html               shell; data-base + data-index on <html>
layouts/home.html                 hero, section cards, compact Recent list
layouts/page.html                 single page; data-pagefind-body
layouts/section.html              header + index body as prose + browse list
layouts/term.html                 /tags/<term>/
layouts/taxonomy.html             /tags/
layouts/search.html               search UI shell; search.js fills it
layouts/404.html
layouts/bookmarks/section.html    section.html with the gathered bookmark collection

layouts/_partials/
  head.html             title, description, favicon, Mastodon rel="me", stylesheet
  sidebar.html          sections / page meta / tag cloud
  breadcrumbs.html      .Ancestors trail
  footer.html           footer; wording from [params.footer]; edit-in-repo link
  crumb-label.html      one crumb's label; date folders kept literal
  sections.html         top-level sections in sectionOrder   (partialCached)
  recent.html           the one "newest first": sort . "Lastmod" "desc"
  page-date.html        created, + updated when >1 day later
  tag-cloud.html        weighted term chips
  site-index.html       builds + publishes index.json, returns URL  (partialCached)
  list-json.html        page collection -> index.json item array
  list-container.html   [data-list] + no-JS <ul> + loads list.js
  list-order.html       order: cascade (page -> ancestors -> site param)
  list-per-page.html    perPage: cascade, same shape
  pagefind-keys.html    hidden sort keys + year filter — see traps.md
  bookmark-urls.html    bookmark:/bookmarks: -> URLs; only reader of those keys
  bookmark-pages.html   bookmarks/ + every page with a bookmark URL  (partialCached)
  bookmark-links.html   the chip row
  bookmark-label.html   one URL's short display form
  category.html         category: -> configured name or ""; only reader of the key
  rating.html           rating: -> int 1–5 or 0; only reader of the key
```

### Browser

```txt
assets/js/site-index.js   58  fetch index.json once per document; scope() subsets
assets/js/sorts.js        40  the eight sorts, ?sort= spellings, normalise/parse
assets/js/cards.js        89  the one card renderer, shared by lists and search; rating filter value
assets/js/list.js        344  browse list: state<->URL, facets, paging, render
assets/js/search.js      203  Pagefind UI: filters, sort, incremental results
assets/css/main.css      632  the whole theme; palette is :root custom properties
```

ES modules, bundled per entry point (`list.js`, `search.js`) by `js.Build` — esbuild
ships inside Hugo, so the build needs no Node.

### Config and delivery

```txt
hugo.toml                            mounts, frontmatter mapping, params (listOrder,
                                     sectionOrder, limits, categories), markup
deploy/publish-to-github-pages.yml   template for the CONTENT repo -> deploy.md
site-content/                        site-owned pages (the search page)
example/txt/                         synthetic default source repo
static/                              favicons, logo
```

**Generated, never edit:** `build/content/` (sync output), `public/` (Hugo +
Pagefind), `resources/_gen/` (asset cache). All gitignored.
