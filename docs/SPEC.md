# Spec

What the site does and should do. Implementation lives in [`docs/wiki/`](wiki/index.md) —
read that before the source. Reasoning is in [`docs/wiki/decisions/`](wiki/decisions/DECISIONS.md),
cited as *(Dn)*.

Items marked **(TBD)** are not built.

## Principles

- **No PublicTxt.Syntax / .NET dependency.** Works with real wikis: relative links, no front matter required.
- Source repo never modified; build operates on generated copy `build/content/`. (UNSURE - Indexes and temp data could be useful for PublicTxt repos and collation)
- Links are `[label](../wiki/page.md)` - No `[[wikilinks]]`
- Hugo renders `.md` extensions to `.html`
- `![alt](youtube-url)` embeds the video; other images stay images.

## Feature list

- Sections
  - Single repo;  top-level folders are sections (`wiki/`, `blog/`, `notes/`, `bookmarks/`, `posts/`, …). Root-level `.md` → plain pages.
  - home list sections by folder name, ordered by `params.sectionOrder` *(D10)*. (TBD-ISSUE)
  - Section index bodies render as prose and are search-indexed.
  - Collections: see [Collections](#collections) — a top-level section lists every page of its collection, wherever filed.
- Sidebar
  - Tag cloud
  - page meta (collections, dates, categories, tags) in sidebar.
  - Author **(TBD)** — carried in front matter, rendered nowhere
- Categories
  - `categories:` (or `category:`), one or a list per page, from a closed list in `hugo.toml`; feature toggleable *(D11, D12)*.
  - Category pages (TBD)
  - Sidebar: a page's categories, and a site-wide list with counts; both link to search
- Tags
  - Inline `#hashtags` merged into `tags`.
  - Facets: tags, collection.
  - tag pages
  - Tag and category facets: include or exclude values; match all or any of the included (default all). One mode per facet — no mixed groups within it like `(a OR b) AND c` (TBD if needed).
- Browse Lists
  - All browse lists (home *Recent*, sections, tag pages) rendered client-side from one site-wide JSON index; plain `<ul>` no-JS fallback *(D6, D7)*.
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
  - Keys updated to differentiate between my posts and others (TBD - UNSURE)
- Pages
  - A post folder (one Markdown file + attachments, no subfolders) converts to a Hugo leaf bundle: the Markdown becomes the page, attachments become its page resources.
  - `publish: off` (or false / no / 0) keeps a page off the site — and a post folder's attachments with it. Hidden, not private: it stays in the source repo.
- Date Properties
  - Converts from YYYYMMDD to required format (TBD)
- Chips
  - Chips showing tags/categories/collections
  - Some chips can toggle in 3 states - include/exclude/off (per facet: `params.chipFacets` `states`, `match`)
  - Click a chip to include it (again to clear); a small ✕ at its right excludes it. The ✕ shows on set chips, and on others on hover / focus

## Content Structure

```txt

index.md, Projects.md                   (home + root pages)

wiki/index.md, wiki/A/index.md          (folder index = section page (any depth))

blog/2023/12/17/x.md                    (dates derived from path)
blog/2024/home.md                       (home.md also acts as folder index)
blog/20260509-title.md                  (YYYYMMDD prefix date)
blog/2024/09/20240922-title.md          (YYYYMMDD prefix date)
blog/2026/09/22/Post-Name/title.md & blog/2026/09/22/Post-Name/image.png     (converts to Hugo content bundle)

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
- `type:` is Hugo's (it picks the layout); it adds no collection.

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
