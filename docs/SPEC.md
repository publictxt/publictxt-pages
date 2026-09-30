# Spec

What the site does and should do. Implementation lives in [`docs/wiki/`](wiki/index.md) —
read that before the source.

Items marked **(TBD)** are not built.

## Feature list

- No PublicTxt.Syntax / .NET dependency
- Build operates on generated copy `build/content/`.
- Hugo renders `.md` extensions to `.html`
- Sections
  - Top-level folders are sections (`wiki/`, `blog/`, `notes/`, `bookmarks/`, `posts/`, …). Root-level `.md` → plain pages.
  - home list sections by folder name, ordered by `params.sectionOrder`. (TBD-ISSUE)
  - Section index bodies render as prose and are search-indexed.
  - Collections: see [Collections](#collections) — a top-level section lists every page of its collection, wherever filed.
  - A folder's index (section page) is `_index.md`, Hugo's name — the only one; any depth, and the root's is home.
  - Sections move to specialised Views over Collections (TBD)
    - Blog view should show timeline like view - that toggles collections. eg. show microblogs/posts, show wiki, show notes, show bookmarks (TBD)
    - Bookmarks should show Bookmark specialised view (TBD)
- Layout: full width; left sidebar, content, right sidebar
  - Header ☰ toggles the left sidebar: collapses it on wide screens (remembered per browser), a drawer on narrower ones. No JS: no button, the sidebar sits below the page.
  - One column on phones: filters fold above the results (open when one is set), page meta below the page.
- Left sidebar
  - Sections, categories, tag cloud
- Right sidebar — context for what's shown
  - page meta (collections, dates, categories, tags) on pages
  - filters on browse lists and search; sort stays by the results
  - Author **(TBD)** — carried in front matter, rendered nowhere
- Categories
  - `categories:` (or `category:`), one or a list per page, from a closed list in `hugo.toml`; feature toggleable.
  - Category pages (TBD)
  - Sidebar: a page's categories, and a site-wide list with counts; both link to search
- Tags
  - Inline `#hashtags` merged into `tags`.
  - Facets: tags, collection.
  - tag pages
  - Tag and category facets: include or exclude values; match all or any of the included (default all). One mode per facet — no mixed groups within it like `(a OR b) AND c` (TBD if needed).
- Browse Lists
  - All browse lists (home *Recent*, sections, tag pages) rendered client-side from one site-wide JSON index; plain `<ul>` no-JS fallback.
  - Sorting in all by Date, Recency, Alphabetical.
  - Filter by Collection, and by Year (the `created` year).
  - Filter by Category and Tag, as the facets above (also in Search)
  - Sort by Source/Author (TBD)
  - Sort (Top/Lowest rated, unrated as 2.5) and filter (minimum) by Rating, 1–5 `rating:` front matter (also in Search)
- Search
  - Full text search
  - Collection, Year and Tag filters as 'facets' are available without a query
  - Finer date filters — month, ranges (TBD)
  - Also Sortable
- Breadcrumbs from `.Ancestors` on all pages but home; folder names, date folders literal.
- Bookmarks
  - A page with a `bookmark:`/`bookmarks:` URL is a bookmark wherever it lives (it joins collection `bookmarks`); pages filed under `bookmarks/` are too, by folder
- Post sources
  - A URL (or list) under a `[params.sources]` key (`facebook:`, `twitter:`, `substack:`, `mastodon:`, `github:`) shows as a "Posted on" link on the page.
  - Filter by source, source chips on cards (TBD)
  - Any page with post sources, should be put in Posts collection (TBD)
- Pages
  - Folders are sections and notes are pages, whatever a folder holds — a post folder (a note + its attachments) is a section with one page. Attach files beside the note instead; no folder needed.
  - `publish: off` (or false / no / 0) keeps a page off the site — and every file of a folder whose Markdown is all unpublished (a draft's attachments; beside published notes, they're published). Hidden, not private: it stays in the source repo.
  - `![alt](youtube-url)` embeds the video; `![alt](file.mp3)` (also m4a, ogg, oga, opus, wav, flac, aac) an audio player; other images stay images.
  - A relative image/audio path must be beside the note (its folder, or a subfolder of it like `attachments/`) or in a top-level folder of files (`media/`); elsewhere it's left as written, with a build warning.
  - `![](page.md)` on its own line embeds that page's content, as Obsidian does; inline, a link. One level deep (nested embeds become links). `#heading` section embeds (TBD — a link for now).
  - A ` ```dataview ` block `LIST FROM #tag` (optional `LIMIT n`) embeds a compact list of that tag's pages, recently updated first; other Dataview queries stay code. Multiple tags, `WHERE`, `SORT` (TBD).
- Date Properties
  - Converts from YYYYMMDD to required format (TBD)
- Chips
  - Chips showing tags/categories/collections
  - Some chips can toggle in 3 states - include/exclude/off (per facet: `params.chipFacets` `states`, `match`)
  - Click a chip to include it (again to clear); a small ✕ at its right excludes it. The ✕ shows on set chips, and on others on hover / focus

## Content Structure

```txt

_index.md, Projects.md                  (home + root pages)

wiki/_index.md, wiki/A/_index.md        (folder index = section page (any depth))

blog/2023/12/17/x.md                    (dates derived from path)
blog/20260509-title.md                  (YYYYMMDD prefix date)
blog/2024/09/20240922-title.md          (YYYYMMDD prefix date)
blog/20260922-title.md & blog/image.png  (attachment beside the note)
blog/Post-Name/title.md & image.png     (post folder: a section with one page)

bookmarks/sites/domain/page.md     (one file per resource; needs `bookmark:` URL)
bookmarks/wiki/topic.md            (pages about bookmarks; no URL needed)

posts/post-name.md
notes/note-name.md

media/                             (non-Markdown copied verbatim)

README*, LICENSE*, CNAME, .git/    (skipped during sync)

```

## Collections

A page is in one or more collections. They show as chips on the page and its cards,
drive the Collection filter in lists and search, and decide which top-level section
lists it.

| Source                          | Collection it adds   |
| ------------------------------- | -------------------- |
| top-level folder it's filed in  | that folder's name   |
| `collections:` (value or list)  | each value           |
| `bookmark:` / `bookmarks:` URL  | `bookmarks`          |

- **Adds, never replaces** — the folder's collection always stays. Root-level pages get `page`.
- **Case-insensitive** — `Notes`, `notes`, `NOTES` are one collection; shown lower-case.
- **Top-level sections gather by collection**: `/notes/` lists every page in `notes`,
  wherever filed; home and sidebar counts match. **Sub-folders don't** — they list only
  what's filed under them.
- **A collection with no folder** (`collections: [recipe]`) is still a chip and a filter
  value; it just has no section page.

```yaml
# posts/2026-09-28-hello.md — listed in Posts and Blog, filterable as either
collections: [blog]
```

## Front Matter Reference

All front matter optional; sync derives the rest.

| Key                     | Purpose                    | Notes                                                                           |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `title`                 | Page title                 | Falls back to first H1 (removed from body), then filename                       |
| `collections`           | Extra collections, value or list | Page also lists under those top-level sections and collection filters. See [Collections](#collections) |
| `tags`                  | Inline or block list       | Merged with `#hashtags`; deduplicated                                           |
| `created`               | ISO 8601 datetime          | Derived from path, git, mtime, or build time if not set                         |
| `updated`               | ISO 8601 datetime          | Derived from git, mtime, or build time if not set; never earlier than `created` |
| `author`, `source_repo` | Metadata                   | Passed through; not filterable                                                  |
| `bookmark`, `bookmarks` | URL or list                | Adds collection `bookmarks`, wherever the page lives. See [Collections](#collections) |
| `facebook`, `mastodon`, … | URL or list            | Where else it was posted; keys and labels in `[params.sources]`. Shown as "Posted on" links |
| `source_path`           | Path in the source repo    | Written by sync; with `params.editURL`, drives the footer "Edit this page" link |

Other keys pass through unchanged. `hugo.toml` maps `created` → `.Date`, `updated` → `.Lastmod`.

## Deployment

Build outputs to `public/`. GitHub Actions workflow (`deploy/publish-to-github-pages.yml`) checks out the content repo, runs the build pipeline, and deploys via `actions/deploy-pages`.

Per-site settings: `HUGO_*` env vars in the workflow, or the content repo's `settings/site.toml`, merged over `hugo.toml` (env vars win).

## Not built, and what would prompt it (TBD)

- `[[wikilink]]` conversion at sync — a repo in hand where legacy wikilinks bite.
- `author` / `source_repo` filters — carried already, but one value per site, so the facets would hide; multi-repo or multi-author content.
- Multi-repo fan-in — aggregation is upstream PublicTxt's job; needs a defined aggregate content model.
- Backlinks ("Linked from") — link graph is cheap at sync; keep edges out of the list index (per-page fetch), a count in it.
- Link weights, trust tiers — no data source yet; a subscriber-declared tier in subscription config is the honest v1 shape.
- Related pages by tag co-occurrence — the site index already holds the data.
