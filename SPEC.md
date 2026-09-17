# PublicTxt-Hugo — v1 Spec

Static site interface for browsing/searching a single PublicTxt (or plain Obsidian) Markdown repository. Hugo + Pagefind.
Dark theme.
Good Search and Browse useability.


## Architecture principle (revised)

**Hugo-native first; minimal standalone preprocessing; no PublicTxt.Syntax dependency.**

This repo must work against a Markdown wiki using relative links, with no .NET toolchain present. Everything Hugo can do natively is done natively. Exactly one preprocessing step exists (hashtag extraction), implemented as a small self-contained script in this repo.

Rationale: keeps `publictxt-hugo` independently useful and testable, avoids coupling the static-site layer to the .NET solution's release cycle.

## Authoring constraint (important)

Obsidian must be configured to:

- **Use Wikilinks: OFF** (emit standard Markdown links)
- **New link format: Relative path to file**

This produces `[label](../wiki/page.md)` rather than `[[page]]`. Hugo's embedded link render hook resolves `.md` destinations to page URLs natively, and the same links remain valid browsing the repo directly on GitHub/GitLab.

`[[wikilink]]` syntax is **not supported in v1** — Hugo has no native support and upstream has declined to add it. Revisit only if authoring friction proves unacceptable.

## Scope (v1)

- Single repo, full structure: `wiki/`, `blog/`, `notes/`, `metaweb/`
- Extract inline `#hashtags` → merge into front matter `tags` (preprocessing step)
- Facets for search + browsing: tags, tag combinations, document type
- Sections listed in sidebar
- Tag cloud / top tags in sidebar
- Content pages show meta info in sidebar
- `author` / `source_repo` carried in front matter, not exposed in UI/filters (v2)

## Content structure

``` txt
content/
  wiki/
  blog/
    <year>/<month>/          e.g. 20260920-1-blog-title.md
  notes/
  metaweb/
    <domain>/<subdomain-or-folder>/   e.g. resource-based-file.md
```

- Section = folder = default `type`
- `metaweb/` entries are one-file-per-resource, rendered as normal pages (single-author-per-repo assumption; cross-repo aggregation is out of scope)

## Front matter contract

```yaml
title: string
type: string          # optional — overrides folder-derived default
tags: [string]         # merged: authored tags + extracted inline #hashtags
author: string          # carried; not filterable in v1
source_repo: string     # carried; not filterable in v1
date: string             # blog only — full ISO 8601 datetime
```

**Note on `date`/`time`**: use a single ISO 8601 datetime (`2026-09-20T14:30:00+02:00`), not separate `date` and `time` fields. Hugo sorts and builds permalinks from `.Date` only; a separate `time` param would require custom sort logic and wouldn't participate in native ordering.

## What is native vs. preprocessed

| Concern | Mechanism |
|---|---|
| Relative `.md` link resolution | Hugo embedded link render hook — native |
| URL-friendly URLs from filenames | Hugo urlize / `slug:` — native, no file renaming |
| Type from folder + `type:` override | Hugo section + front matter — native |
| Sections, tag cloud, meta sidebar | Hugo templates — native |
| Blog ordering / permalinks | Hugo `.Date` — native |
| **Inline `#hashtag` → `tags`** | **Preprocessing script — the only non-native step** |
| Search, tag facets, tag combinations | Pagefind (post-build) |

### Why hashtag extraction can't be native

Hugo builds taxonomies from front matter before content rendering. Templates can regex `.RawContent` to extract hashtags for display or Pagefind filter attributes, but cannot inject them into Hugo's taxonomy system — so native `/tags/foo/` pages and the tag cloud would miss inline tags. Preprocessing is required for a single, consistent tag source.

### Preprocessing script requirements

- Self-contained, no .NET dependency (language TBD — Go, Python, or shell)
- Single responsibility: scan body, extract `#hashtag`, merge into front matter `tags`, dedupe
- Must **not** strip hashtags from body text (they stay visible for Obsidian-style reading)
- Must skip hashtags inside fenced/inline code blocks
- Idempotent — safe to re-run

## Build pipeline

``` txt
preprocess (hashtag merge)  →  hugo build  →  pagefind --site public
```

Order is mandatory. Pagefind indexes rendered HTML; Hugo must run first.

## Search / filter (Pagefind)

- Full-text search plus faceted filtering
- Facets driven by `data-pagefind-filter` attributes emitted in templates (tags, type)
- Tag **combinations** handled by Pagefind's multi-filter support — Hugo taxonomies cannot express intersections
- Hugo taxonomy pages remain as a separate native browse path (`/tags/foo/`); these are two independent mechanisms over the same data, not one system

## Theme

- Layout: content area + sidepane (sections, tag cloud, filters, search, page meta)
- Requires Hugo **extended** (SCSS pipeline)
- Thin vertical slice first

## Deferred to v2+

- `author` / `source_repo` as active filters
- Cross-repo aggregation of `metaweb/` resources (needs resource-identity/normalization decision)
- Multi-repo subscription/fan-in
- Backlinks / graph view
- Tag co-occurrence / relatedness
