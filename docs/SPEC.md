# PublicTxt-Hugo — v1 Spec

Static site interface for browsing/searching a single PublicTxt (or plain Obsidian) Markdown repository. Hugo + Pagefind.
Dark theme. Good search and browse usability.

**This file describes what the build does today.**
The reasoning lives in [`docs/decisions/D<n>.md`, referenced below as *(D1)*, *(D2)*.
Look up Decisions only when needed.

## Architecture principle

**no PublicTxt.Syntax dependency.**

This repo must work against a real Markdown wiki with relative links and **no front matter**, with no .NET toolchain present. Everything Hugo can do natively is done natively. Python preprocessing and client-side Javascript can be used for added functionality.

1. `scripts/sync_content.py` — copy the source repo to a generated content dir and normalise what Hugo cannot handle
2. `scripts/extract_hashtags.py` — merge inline `#hashtags` into front matter `tags`

The source repository is **never modified**; both scripts operate on the generated copy. *(D1)*

## Authoring constraint

This produces `[label](../wiki/page.md)` rather than `[[page]]`. Hugo's embedded link render hook resolves `.md` destinations to page URLs natively, and the same links remain valid browsing the repo directly on GitHub/GitLab.

`[[wikilink]]` syntax is **not supported** — they render as literal text. *(D5)*

## Scope

- Single repo, full structure: `wiki/`, `blog/`, `notes/`, `bookmarks/`, plus any other top-level folder (e.g. `posts/`) as a section
- Root-level pages (`Projects.md`, …) published as plain pages outside any section
- Extract inline `#hashtags` → merge into front matter `tags`
- Facets for search + browsing: tags, tag combinations, document type
- Sections listed in sidebar and on the home page (folder-derived names, not the index page's H1), in the fixed order given by `params.sectionOrder` (unlisted sections follow alphabetically) *(D10)*
- Breadcrumbs on every page except home (`Home › Wiki › Science › Brain › Page`), built from Hugo's native `.Ancestors`; section crumbs use folder names, numeric date folders stay literal
- Tag cloud / top tags in sidebar
- Content pages show meta info (type, date, tags) in sidebar
- Section index bodies render as prose and are indexed for search, the same as single pages
- Browse lists (home *Recent*, every section page, every tag page) are rendered client-side from one site-wide JSON page index — sortable, filterable by tag and type, paged, with the view in the URL. Hugo renders a plain link list as the no-JS fallback. See *Browse lists* below *(D6, D7)*


## Content structure — what real repos look like

```txt
<repo>/
  index.md                       home page
  Projects.md, online-things.md  root-level pages
  wiki/
    index.md                     folder index (becomes section page)
    Computer-Science/index.md    nested folders, each with its own index.md
    Science/brain/Consciousness.md
    Projects/PublicTxt/Other Software.md     spaces in names
  blog/
    index.md
    2023/12/17/20231217.md       date from path
    2023/12/17/another-post.md   date from path
    2024/home.md                 home.md as folder index
    2024/20241013-title.md       date from YYYYMMDD- prefix
    20260509-title.md            date from YYYYMMDD- prefix
  notes/home.md, notes/Info politics/The WhatsApp Mess . 20240816.md
  bookmarks/sites/<domain>/<page>.md
  posts/20260101-title.md        
  media/                         non-Markdown assets, copied verbatim
  README.md LICENSE CNAME .obsidian/ .gitkeep   skipped
```

- Section = top-level folder = default `type`
- Any folder may carry an `index.md` or `home.md` as its landing page
- `bookmarks/` entries are one-file-per-resource, rendered as normal pages (single-author-per-repo assumption; cross-repo aggregation is out of scope); pages elsewhere with a `bookmark:` front matter URL are listed there too (see *Bookmarks from front matter*)
- `example/txt/` in this repo is a synthetic repo exhibiting all of the above and is the default build source

## Front matter contract

Everything is optional. Where absent, the sync step derives it:

```yaml
title: string        # else: first `# H1` in the body (removed from body), else filename
type: string         # optional — overrides folder-derived default
tags: [string]       # inline `[a, b]` or block `- a` list; merged with extracted #hashtags, rewritten inline
created: string      # when the page was written; else derived — see the date ladders below
updated: string      # when it last changed; else derived. Every page ends up with both.
                     #   Legacy `date:` / `lastmod:` are accepted as aliases and renamed in the copy
author: string       # carried; not filterable in v1
source_repo: string  # carried; not filterable in v1
bookmark: url        # URL or list of URLs; makes the page a bookmark wherever it lives
                     #   (`bookmarks:` is accepted as an alias)
```

Any other front matter keys (`web:`, `web-links:`, …) are passed through untouched.

### Bookmarks from front matter

A page may carry `bookmark: <url>` (or list). Templates list it in `bookmarks/` section (merged with native pages, newest first), show URL on card/header/meta, but keep page at original location with original `type`, URL, breadcrumbs. Done entirely in templates; sync step does nothing. Requires `bookmarks/` folder for section page.

**Note on `created`/`updated`**: when authored explicitly, use a single ISO 8601 datetime (`2026-09-20T14:30:00+02:00`), not separate date and time fields. `hugo.toml` maps `created` → `.Date` and `updated` → `.Lastmod`; Hugo sorts and renders from those only.

### The date ladders

Every page gets both a `created` and an `updated` time, so recency ordering works across all types — not just `blog/` — and means one thing everywhere: lists sort on `updated` by default, cards show `created` plus *· updated …* when the page changed more than a day later. `scripts/dates.py` resolves them, most to least authoritative:

| `created_source` | Where `created` comes from |
|---|---|
| `front-matter` | an explicit `created:` (or legacy `date:`) in the source file |
| `path` | `YYYYMMDD` or `YYYY-MM-DD` anywhere in the filename, or a `.../YYYY/MM/DD/` path |
| `git` | the **first** commit that touched the source file |
| `mtime` | the file's birth time where the OS reports one, else its modification time |
| `build` | the time of this build — last resort |
| `children` | generated section indexes only: the newest `updated` among the folder's pages |

`updated` has a shorter ladder with no authored-vs-inferred ambiguity: an explicit `updated:` (or legacy `lastmod:`), else the **last** commit that touched the file, else its modification time, else the build time. It is never earlier than `created`.

The rung `created` came from is written into the generated front matter as `created_source:`. Templates do not read it; it makes a bad inference visible in `build/content/` rather than silently wrong in a listing. *(D4)*

Section indexes take their newest descendant's `updated` whenever their own was merely inferred and is older — a section is recent when its contents are, not only when its landing page was last touched. An authored `updated:` on an index is never overwritten.

**CI caveat**: `actions/checkout` defaults to `fetch-depth: 1`. A shallow clone has one commit, so every tracked file reports that commit's time at both ends and the `git` rung collapses to a single timestamp. `deploy/publish-to-github-pages.yml` sets `fetch-depth: 0`; the sync step warns when it sees a shallow repo.

## What is native vs. preprocessed

| Concern | Mechanism |
|---|---|
| Relative `.md` link resolution | Hugo embedded link render hook (`useEmbedded = "fallback"`) — native |
| URL-friendly URLs from filenames (spaces, dots, case) | Hugo urlize — native, no file renaming |
| Type from folder + `type:` override | Hugo section + front matter — native |
| Sections, tag cloud, meta sidebar | Hugo templates — native |
| Ordering (all types) | `updated` / `created` / `title` from the JSON index — client-side (`assets/js/list.js`); default per site or section |
| List data (one site-wide `index.json`) | Hugo asset pipeline — native (`layouts/_partials/site-index.html`) |
| Tag browse pages `/tags/foo/` | Hugo taxonomy — native |
| **`index.md`/`home.md` → `_index.md`** | **sync step** |
| **`title` derivation** | **sync step** |
| **`created`/`updated` derivation** | **sync step** (`dates.py`) |
| **Skipping repo housekeeping files** | **sync step** |
| **Inline `#hashtag` → link to its tag page** | **sync step** |
| **Inline `#hashtag` → `tags`** | **hashtag step** |
| Search, tag facets, tag combinations | Pagefind (post-build) |

The two preprocessed concerns are forced, not chosen: Hugo's leaf-bundle rule makes the
`index.md` → `_index.md` rename impossible to do in templates *(D2)*, and taxonomies are built
from front matter before rendering, so inline hashtags cannot reach them from a template
*(D3)*.

### Preprocessing script requirements

Both scripts:

- Self-contained Python 3, no third-party dependencies
- Idempotent — safe to re-run
- Never write to the source repo
- Share one definition of what an inline hashtag is (`hashtags.py`) and one of how a
  date is resolved (`dates.py`), so a page's
  linked hashtags and the tag cloud can never disagree. A hashtag is `#` + letter +
  letters/digits/`_`/`-`, not preceded by a word character, `/` or `&`, and not inside
  fenced/inline code, HTML, an existing link, or a URL — a fragment like
  `…/page/#section` is not a tag. An already-linkified hashtag still counts as that tag.

`sync_content.py`:

- Wipes and recreates the destination (`build/content/`, gitignored)
- Renames `index.md`/`home.md` → `_index.md`; rewrites link destinations pointing at them
- Creates a minimal `_index.md` (title = folder name) in any folder holding Markdown but no index page, so every folder is a Hugo section: browsable, listed, and present in breadcrumbs
- Derives `title` as per the front matter contract; preserves existing front matter verbatim
- Derives `created` + `created_source` and `updated` via the ladders above, for every page; renames legacy `date:` / `lastmod:` to the new keys in the copy
- Linkifies inline `#hashtags` to `/tags/<tag>/`, leaving the visible text as `#hashtag`. Hugo's embedded link render hook resolves the destination to the term page, so subpath deployments get the right prefix
- Skips `README*`, `LICENSE*`, `CONTRIBUTING*`, `CNAME`, `.gitignore`, `.obsidian/`, `.git/`, `.trash/`, `*.gitkeep`
- Copies non-Markdown files verbatim

`extract_hashtags.py`:

- Single responsibility: scan body, extract `#hashtag`, merge into front matter `tags`, dedupe, create front matter if absent
- Must **not** strip hashtags from body text (they stay visible for Obsidian-style reading)
- Interprets only the `tags` key (inline, block, or scalar form); every other front matter line passes through

## Build pipeline

```txt
sync (repo → build/content)  →  hashtag merge  →  hugo build  →  pagefind --site public
```

Order is mandatory. Pagefind indexes rendered HTML; Hugo must run first. `public/` is removed before each build because Hugo does not delete stale pages.

Wrapped by `scripts/build.sh` / `scripts/build.ps1`, which take the source repo path (default `example/txt`) and honour `HUGO_BASEURL`.

## Browse lists (JSON + JS)

The site publishes **one** page index (`layouts/_partials/site-index.html`, serialised by `list-json.html` from `site.RegularPages`): one object per page with `url`, `title`, `type`, `section`, `tags`, `created`, `updated` (RFC 3339), `summary` and bookmark URLs. It is fingerprinted in production and its URL is on `<html data-index>`.

Each list page declares *which subset of that index* it shows rather than carrying its own copy of the data — `data-scope-kind` / `data-scope-value` on the container, resolved by `assets/js/site-index.js`:

| Scope | Shows | Server-side equivalent |
|---|---|---|
| `section` | pages below the section's path | `.RegularPagesRecursive` |
| `tag` | pages carrying the tag | term `.Pages` |
| `bookmarks` | the `bookmarks/` subtree plus any page with a `bookmark:` URL | `bookmark-pages.html` |
| `recent` | the N most recently updated, site-wide | home, capped at `params.recentLimit` |

The HTML page holds a `[data-list]` container (`layouts/_partials/list-container.html`) with a plain `<ul>` of links inside — what crawlers and no-JS readers get. `assets/js/list.js` scopes the index and replaces the fallback with cards, plus:

- **Sort**: recently updated (default), newest, oldest, title A→Z / Z→A, least recently updated. The default comes from `params.listOrder`, overridable per section (and its sub-folders) with `order:` on the index page
- **Filter**: chips for tag and type with counts within the current result set; several tags AND together. A facet only appears when the list varies on it, so a one-type section shows no type chips and a tag page hides its own tag. This gives tag combinations on tag pages themselves
- **Paging**: `params.listPerPage` / `perPage:` cards per page; a pager with real links
- **URL state**: `?tag=a&tag=b&type=wiki&sort=title&page=2`, so any view is linkable and back/forward work. `q` stays reserved for search. Sort names and their canonical `?sort=` forms are shared with the search page (`assets/js/sorts.js`)

Home's *Recent* list uses the same component in compact mode (cards only). Cards are drawn by `assets/js/cards.js`, shared with the search page, so a page looks the same wherever it is listed. Both scripts are bundled by `js.Build` (esbuild is in plain Hugo, so non-extended Hugo still works).

The index is roughly 300 bytes a page and gzips well. Why client-side lists rather than Hugo
pagination or Pagefind *(D6)*; why one index rather than one per list page *(D7)*.

## Search / filter (Pagefind)

- Full-text search plus faceted filtering, **with or without a search term** — selecting tags alone browses by tag combination
- Facets driven by `data-pagefind-filter` attributes emitted in templates (`tag`, `type`)
- Tag **combinations** are AND-ed via Pagefind's multi-filter support. `type` is single-select
- Custom UI (`layouts/search.html`) on the Pagefind JS API. Filter counts reflect the current result set; results show clickable tag chips *(D8)*
- **Sort**: the same six orders as the browse lists (`assets/js/sorts.js`), plus *Relevance* — offered, and the default, only when there is a query; filter-only browsing defaults to recently updated. Pagefind sorts inside its index from keys every indexed template emits via `pagefind-sort.html` (dates as Unix seconds, title lower-cased), so ordering never loads a fragment per hit. A sort replaces relevance ranking outright — there is no relevance-then-date tiebreak. Pagefind drops pages lacking a sort key, so any new template carrying `data-pagefind-body` must include the partial
- URL state: `/search/?q=…&tag=a&tag=b&type=wiki&sort=title` — tag pages deep-link into it (`/tags/foo/` → "combine with other tags"); the header search box submits `?q=`
- Tag pages (`/tags/foo/`) are the browse path over the same data: filterable by further tags and type from the site-wide page index (see *Browse lists*), and deep-linking into search for full text. Two mechanisms over one data set: Pagefind for text, the JSON index for structured browsing

## Theme

- Layout: sticky header with search box; sidebar (sections, page meta, tag cloud) + content area
- Dark palette in CSS custom properties; responsive (sidebar drops below content on narrow screens)
- Plain CSS (`assets/css/main.css`), pipelined through Hugo's asset pipeline (minify + fingerprint in production) — no Sass, so **plain (non-extended) Hugo works** *(D9)*

## Deployment

The content repo stays pure Markdown. A GitHub Actions workflow in the **content** repo checks out this repo alongside it, runs the pipeline, and deploys `public/` with `actions/deploy-pages`. See `deploy/publish-to-github-pages.yml`.

## Not yet built

Wikilink conversion, `author` / `source_repo` filters, multi-repo fan-in, backlinks, link
weights, trust tiers, tag co-occurrence.

These are listed in [`DECISIONS.md` → *Not yet decided*](DECISIONS.md#not-yet-decided) with,
for each, why it hasn't happened and what would change that. That list is not a roadmap and
not a reason to defer any of them — several are cheap, and one ("tag co-occurrence") only
became possible with D7.
