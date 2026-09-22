# SPEC

Static site (Hugo + Pagefind + Python Preprocessing + Javascript ) for browsing/searching one PublicTxt / plain Obsidian Markdown repo.
Describes what the build does today; reasoning is in `docs/decisions/D<n>.md`, cited as *(Dn)* — read only when needed.

## Principles

- **No PublicTxt.Syntax / .NET dependency.** Must work on a real wiki with relative links and no front matter. Hugo-native where possible; Python preprocessing + client JS otherwise.
- Source repo is **never modified**; scripts operate on the generated copy `build/content/` *(D1)*.
- Links are `[label](../wiki/page.md)`; Hugo's embedded link render hook resolves `.md`. `[[wikilinks]]` render as literal text *(D5)*.

## Scope

- Single repo; every top-level folder is a section (`wiki/`, `blog/`, `notes/`, `bookmarks/`, `posts/`, …). Root-level `.md` → plain pages.
- Inline `#hashtags` merged into `tags`. Facets: tags (AND-able), type.
- Sidebar + home list sections by folder name, ordered by `params.sectionOrder`, unlisted alphabetically after *(D10)*.
- Breadcrumbs from `.Ancestors` on all pages but home; folder names, date folders literal.
- Tag cloud in sidebar; page meta (type, dates, tags) in sidebar.
- Section index bodies render as prose and are search-indexed.
- All browse lists (home *Recent*, sections, tag pages) rendered client-side from one site-wide JSON index; plain `<ul>` no-JS fallback *(D6, D7)*.

## Content structure

```txt
index.md; Projects.md            home; root pages
wiki/index.md, wiki/A/index.md   folder index = section page (any depth); spaces in names OK
blog/2023/12/17/x.md             date from path
blog/2024/home.md                home.md also a folder index
blog/20260509-title.md           date from YYYYMMDD prefix
bookmarks/sites/<domain>/<p>.md  one file per resource, normal pages
media/                           non-Markdown copied verbatim
README* LICENSE* CONTRIBUTING* CNAME .gitignore .obsidian/ .git/ .trash/ *.gitkeep   skipped
```

Section = top-level folder = default `type`. `example/txt/` is the synthetic default source.

## Front matter (all optional; sync derives the rest)

```yaml
title:        # else first H1 (removed from body), else filename
type:         # overrides folder default
tags:         # inline or block list; merged with #hashtags, rewritten inline
created:      # ISO 8601 datetime; legacy `date:` alias renamed in copy
updated:      # legacy `lastmod:` alias renamed. Every page ends with both.
author:, source_repo:   # carried, not filterable
bookmark:     # URL or list (`bookmarks:` alias); page is listed in bookmarks/ section
              # but keeps its own location/type/URL/breadcrumbs. Templates only; needs bookmarks/ folder.
```

Other keys pass through. `hugo.toml` maps `created`→`.Date`, `updated`→`.Lastmod`.

### Date ladders (`scripts/dates.py`) *(D4)*

`created`, most→least authoritative; rung recorded as `created_source:` in generated front matter (diagnostic only):

| rung | source |
|---|---|
| `front-matter` | explicit `created:` / `date:` |
| `path` | `YYYYMMDD` / `YYYY-MM-DD` in filename, or `.../YYYY/MM/DD/` |
| `git` | first commit touching the file |
| `mtime` | birth time else mtime |
| `build` | build time |
| `children` | generated section indexes: newest `updated` of children |

`updated`: explicit → last commit → mtime → build time; never earlier than `created`. Section indexes take newest descendant `updated` when their own was inferred and older; authored `updated:` never overwritten.

Lists sort on `updated` by default; cards show `created` plus *· updated* when >1 day later.

CI: shallow clones collapse the `git` rung; `deploy/publish-to-github-pages.yml` uses `fetch-depth: 0`, sync warns on shallow repo.

## Native vs preprocessed

| Concern | Mechanism |
|---|---|
| `.md` link resolution | link render hook (`useEmbedded = "fallback"`) |
| URL-safe slugs | Hugo urlize, no renaming |
| type, sections, tag cloud, meta, `/tags/x/` | Hugo native |
| Site index JSON | `layouts/_partials/site-index.html` via asset pipeline |
| Ordering | client-side `assets/js/list.js` |
| `index.md`/`home.md` → `_index.md`; title; dates; skips; hashtag linkify | **sync step** *(D2)* |
| `#hashtag` → `tags` | **hashtag step** *(D3)* |
| Search + facets | Pagefind post-build |

### Scripts (Python 3, idempotent, never write to source)

Shared: `hashtags.py` (hashtag = `#` + letter + `[letters digits _ -]`, not after word char, `/`, `&`; not inside code, HTML, links, URLs; already-linkified hashtags still count) and `dates.py`.

`sync_content.py`: wipes/recreates `build/content/`; renames index/home → `_index.md` and rewrites links to them; creates minimal `_index.md` (title = folder) in index-less folders so every folder is a section; derives title/dates; linkifies `#tag` → `/tags/<tag>/` keeping visible text; skips housekeeping files; copies non-Markdown verbatim.

`extract_hashtags.py`: extract body `#hashtags` → merge into `tags`, dedupe, create front matter if absent; never strips hashtags from body; touches only `tags`.

## Build

```txt
sync → hashtag merge → hugo → pagefind --site public
```
Order mandatory. `public/` wiped before build. `scripts/build.sh` / `build.ps1` take source path (default `example/txt`), honour `HUGO_BASEURL`.

## Browse lists

One index (`site-index.html` → `list-json.html` from `site.RegularPages`): `url, title, type, section, tags, created, updated (RFC 3339), summary, bookmark URLs`. Fingerprinted; URL on `<html data-index>`. ~300 B/page.

List pages declare a scope via `data-scope-kind` / `data-scope-value` (`assets/js/site-index.js`):

| scope | shows | server equiv |
|---|---|---|
| `section` | pages below path | `.RegularPagesRecursive` |
| `tag` | pages with tag | term `.Pages` |
| `bookmarks` | `bookmarks/` + any `bookmark:` page | `bookmark-pages.html` |
| `recent` | N newest updated, `params.recentLimit` | home |

`list-container.html` holds `[data-list]` with fallback `<ul>`; `list.js` replaces with cards (`cards.js`, shared with search):
- Sort: updated (default), newest, oldest, title A→Z/Z→A, least recently updated. Default `params.listOrder`; per-section `order:` on index (inherits to sub-folders).
- Filter chips: tag + type with counts within result set; tags AND. Facet hidden when list doesn't vary on it.
- Paging: `params.listPerPage` / `perPage:`; real pager links.
- URL state: `?tag=a&tag=b&type=wiki&sort=title&page=2`; `q` reserved. Sort names shared with search (`assets/js/sorts.js`).

Home *Recent* = compact mode. JS bundled with `js.Build` (non-extended Hugo OK).

## Search (Pagefind, `layouts/search.html`)

- Full text + facets, with or without a query. Filters from `data-pagefind-filter` (`tag` multi/AND, `type` single). Counts reflect result set; results show tag chips *(D8)*.
- Sort: same six + *Relevance* (default, only with a query; filter-only defaults to updated). Keys emitted per page by `pagefind-sort.html` (dates as Unix s, title lowercased); sort replaces relevance, no tiebreak. **Any template with `data-pagefind-body` must include the partial** or Pagefind drops the page.
- URL: `/search/?q=…&tag=a&type=wiki&sort=title`; header box submits `?q=`; tag pages deep-link "combine with other tags".

## Theme

Sticky header w/ search; sidebar (sections, meta, tag cloud) + content; responsive. Plain CSS `assets/css/main.css` via asset pipeline (minify+fingerprint in prod), no Sass *(D9)*.

## Deployment

Content repo stays pure Markdown; its GitHub Actions workflow checks out this repo alongside, runs pipeline, deploys `public/` via `actions/deploy-pages`. See `deploy/publish-to-github-pages.yml`.

