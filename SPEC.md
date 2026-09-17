# PublicTxt-Hugo — v1 Spec

Static site interface for browsing/searching a single PublicTxt (or plain Obsidian) Markdown repository. Hugo + Pagefind.
Dark theme. Good search and browse usability.

## Architecture principle (revised twice)

**Hugo-native first; one small sync/normalise step; no PublicTxt.Syntax dependency.**

This repo must work against a real Markdown wiki with relative links and **no front matter**, with no .NET toolchain present. Everything Hugo can do natively is done natively.

The original intent was "exactly one preprocessing step (hashtag extraction)". Testing against a real repo showed that is not enough — see *Why a sync step is unavoidable* below. v1 therefore has **one preprocessing stage in two scripts**:

1. `scripts/sync_content.py` — copy the source repo to a generated content dir and normalise what Hugo cannot handle
2. `scripts/extract_hashtags.py` — merge inline `#hashtags` into front matter `tags`

The source repository is **never modified**; both scripts operate on the generated copy.

Rationale: keeps `publictxt-hugo` independently useful and testable, avoids coupling the static-site layer to the .NET solution's release cycle, and keeps authors' repos free of generator-specific front matter.

## Authoring constraint

Obsidian must be configured to:

- **Use Wikilinks: OFF** (emit standard Markdown links)
- **New link format: Relative path to file**

This produces `[label](../wiki/page.md)` rather than `[[page]]`. Hugo's embedded link render hook resolves `.md` destinations to page URLs natively, and the same links remain valid browsing the repo directly on GitHub/GitLab.

`[[wikilink]]` syntax is **not supported in v1** — they render as literal text. Hugo has no native support and upstream has declined to add it. Real repos do contain legacy wikilinks; converting them at sync time is a v2 candidate (the sync step already rewrites link destinations, so the hook exists).

## Scope (v1)

- Single repo, full structure: `wiki/`, `blog/`, `notes/`, `metaweb/`, plus any other top-level folder (e.g. `posts/`) as a section
- Root-level pages (`Projects.md`, …) published as plain pages outside any section
- Extract inline `#hashtags` → merge into front matter `tags`
- Facets for search + browsing: tags, tag combinations, document type
- Sections listed in sidebar (folder-derived names, not the index page's H1)
- Breadcrumbs on every page except home (`Home › Wiki › Science › Brain › Page`), built from Hugo's native `.Ancestors`; section crumbs use folder names, numeric date folders stay literal
- Tag cloud / top tags in sidebar
- Content pages show meta info (type, date, tags) in sidebar
- `author` / `source_repo` carried in front matter, not exposed in UI/filters (v2)

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
  metaweb/sites/<domain>/<page>.md, metaweb/wiki/Obsidian.md.md
  posts/index.md                 empty section
  media/                         non-Markdown assets, copied verbatim
  README.md LICENSE CNAME .obsidian/ .gitkeep   skipped
```

- Section = top-level folder = default `type`
- Any folder may carry an `index.md` or `home.md` as its landing page
- `metaweb/` entries are one-file-per-resource, rendered as normal pages (single-author-per-repo assumption; cross-repo aggregation is out of scope)
- `example/txt/` in this repo is a synthetic repo exhibiting all of the above and is the default build source

## Front matter contract

Everything is optional. Where absent, the sync step derives it:

```yaml
title: string        # else: first `# H1` in the body (removed from body), else filename
type: string         # optional — overrides folder-derived default
tags: [string]       # inline `[a, b]` or block `- a` list; merged with extracted #hashtags, rewritten inline
date: string         # blog: else derived from YYYYMMDD filename prefix or blog/YYYY/MM/DD/ path
author: string       # carried; not filterable in v1
source_repo: string  # carried; not filterable in v1
```

Any other front matter keys (`web:`, `web-links:`, `bookmarks:`, …) are passed through untouched.

**Note on `date`/`time`**: when authored explicitly, use a single ISO 8601 datetime (`2026-09-20T14:30:00+02:00`), not separate `date` and `time` fields. Hugo sorts and builds permalinks from `.Date` only. Derived dates are date-only; posts with no derivable date sort last.

## What is native vs. preprocessed

| Concern | Mechanism |
|---|---|
| Relative `.md` link resolution | Hugo embedded link render hook (`useEmbedded = "fallback"`) — native |
| URL-friendly URLs from filenames (spaces, dots, case) | Hugo urlize — native, no file renaming |
| Type from folder + `type:` override | Hugo section + front matter — native |
| Sections, tag cloud, meta sidebar | Hugo templates — native |
| Blog ordering / permalinks | Hugo `.Date` — native |
| Tag browse pages `/tags/foo/` | Hugo taxonomy — native |
| **`index.md`/`home.md` → `_index.md`** | **sync step** |
| **`title`/`date` derivation** | **sync step** |
| **Skipping repo housekeeping files** | **sync step** |
| **Inline `#hashtag` → link to its tag page** | **sync step** |
| **Inline `#hashtag` → `tags`** | **hashtag step** |
| Search, tag facets, tag combinations | Pagefind (post-build) |

### Why a sync step is unavoidable

Hugo treats any folder containing `index.md` as a **leaf bundle**: sibling `.md` files become page *resources* and are not rendered as pages. Real repos use `index.md` (and `home.md`) as folder landing pages throughout the wiki. There is no Hugo configuration that changes this; the file must be renamed to `_index.md`. Once a copy step exists, deriving `title`/`date` there is cheaper and more robust than template-side hacks (which could never fix sort order anyway).

### Why hashtag extraction can't be native

Hugo builds taxonomies from front matter before content rendering. Templates can regex `.RawContent` to extract hashtags for display or Pagefind filter attributes, but cannot inject them into Hugo's taxonomy system — so native `/tags/foo/` pages and the tag cloud would miss inline tags. Preprocessing is required for a single, consistent tag source.

### Preprocessing script requirements

Both scripts:

- Self-contained Python 3, no third-party dependencies
- Idempotent — safe to re-run
- Never write to the source repo
- Share one definition of what an inline hashtag is (`hashtags.py`), so a page's
  linked hashtags and the tag cloud can never disagree. A hashtag is `#` + letter +
  letters/digits/`_`/`-`, not preceded by a word character, `/` or `&`, and not inside
  fenced/inline code, HTML, an existing link, or a URL — a fragment like
  `…/page/#section` is not a tag. An already-linkified hashtag still counts as that tag.

`sync_content.py`:

- Wipes and recreates the destination (`build/content/`, gitignored)
- Renames `index.md`/`home.md` → `_index.md`; rewrites link destinations pointing at them
- Creates a minimal `_index.md` (title = folder name) in any folder holding Markdown but no index page, so every folder is a Hugo section: browsable, listed, and present in breadcrumbs
- Derives `title` and blog `date` as per the front matter contract; preserves existing front matter verbatim
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

## Search / filter (Pagefind)

- Full-text search plus faceted filtering, **with or without a search term** — selecting tags alone browses by tag combination
- Facets driven by `data-pagefind-filter` attributes emitted in templates (`tag`, `type`)
- Tag **combinations** are AND-ed via Pagefind's multi-filter support — Hugo taxonomies cannot express intersections. `type` is single-select.
- Custom UI (`layouts/search.html`) on the Pagefind JS API rather than Pagefind's stock UI, which cannot run filter-only searches. Filter counts reflect the current result set; results show clickable tag chips.
- URL state: `/search/?q=…&tag=a&tag=b&type=wiki` — tag pages deep-link into it (`/tags/foo/` → "combine with other tags"); the header search box submits `?q=`
- Hugo taxonomy pages remain as a separate native browse path (`/tags/foo/`); these are two independent mechanisms over the same data, not one system

## Theme

- Layout: sticky header with search box; sidebar (sections, page meta, tag cloud) + content area
- Dark palette in CSS custom properties; responsive (sidebar drops below content on narrow screens)
- Plain CSS (`assets/css/main.css`), pipelined through Hugo's asset pipeline (minify + fingerprint in production) — no Sass, so **plain (non-extended) Hugo works**

## Deployment

The content repo stays pure Markdown. A GitHub Actions workflow in the **content** repo checks out this repo alongside it, runs the pipeline, and deploys `public/` with `actions/deploy-pages`. See `deploy/publish-to-github-pages.yml`.

## Deferred to v2+

- `[[wikilink]]` conversion at sync time
- `author` / `source_repo` as active filters
- Cross-repo aggregation of `metaweb/` resources (needs resource-identity/normalization decision)
- Multi-repo subscription/fan-in
- Backlinks / graph view
- Tag co-occurrence / relatedness
