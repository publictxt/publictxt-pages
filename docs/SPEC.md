# Spec

What the site does and should do. How it works lives in [`docs/wiki/`] ( that before the source)and the source; settings and defaults in `docs/user/`.

Items marked **(TBD)** are not built.

## Feature list

- Build operates on generated copy `build/content/`.
- Sections
  - Top-level folders are sections (`wiki/`, `blog/`, `notes/`, `bookmarks/`, `posts/`, …). Root-level `.md` → plain pages.
  - A folder's index (section page) is `_index.md` — at any depth; the root's is home. Its body renders as prose and is search-indexed.
  - The sidebar lists sections by folder name, in `params.sectionOrder`. (TBD-ISSUE)
  - Top-level sections list every page of their [collection](#collections), wherever filed.
  - Contents views below a section's index body (server-rendered, not search-indexed):
    - Folder tree for `treeSections` (default wiki).
    - Timeline by date for `timelineSections` (default blog, posts) once the list spans two or more months.
  - Sections move to specialised Views over Collections (TBD)
    - Blog view: timeline-like, toggling collections (a page's shared timeline already does this for `timelineCollections`).
    - Bookmarks view.
    - Wiki view: a right-column panel of categories, beside the folder tree.
    - Panels per section, not one view each: a section lists its right-column panels in order (e.g. `panels: [tree, timeline]`), cascading from its `_index.md`. `timelineCollections`/`timelineTags` and `treeSections` would fold into it.
    - Non-log timelines (wiki, notes) may want `updated`, not `created`, as their date.
- Layout: left sidebar, content, right sidebar, centred beyond a max width. Header ☰ toggles the left sidebar. One column on phones. Works without JS.
- Left sidebar: sections, categories, tag cloud.
- Right sidebar — context for what's shown
  - Page meta (collections, dates, categories, tags), then a timeline of the page's neighbours with the page marked. Scope: pages of `timelineCollections` (default blog, posts) share one, with collection chips and `timelineTags` chips to narrow it; other pages get their section's; root-level pages none.
  - Pages of `treeSections` get their section's folder tree instead — folders only, so a page filed elsewhere with `collections: wiki` isn't in it.
  - On browse lists and search: the filters, then (lists) a timeline.
  - Author (TBD) — carried in front matter, rendered nowhere.
- Categories
  - `categories:` (or `category:`) from a closed list in `hugo.toml`; feature toggleable.
  - Category pages (TBD)
- Tags
  - Inline `#hashtags` merged into `tags`.
  - Tag pages.
  - Tag and category facets: include or exclude values; match all or any (default all). One mode per facet — no mixed groups like `(a OR b) AND c` (TBD if needed).
- Browse lists
  - Home *Recent*, sections and tag pages render client-side from one site-wide JSON index, with a plain `<ul>` no-JS fallback.
  - Home *Recent*: every page, recently updated first.
  - Sort by Date, Recency, Alphabetical, Rating. Sort by Source/Author (TBD).
  - Filters: Collection, Category, Tag, Rating (`rating:` 1–5, minimum), and Year/month picked from the timeline.
  - Compact toggle for one-line cards.
- Search
  - Full-text search via Pagefind.
  - Same facets and sorts as browse lists, usable without a query. Date ranges (TBD).
- Breadcrumbs on all pages but home, from folder names.
- Bookmarks
  - A page with a `bookmark:`/`bookmarks:` URL is a bookmark wherever it lives; pages under `bookmarks/` are too.
- Post sources
  - A URL under a `[params.sources]` key (`facebook:`, `twitter:`, `substack:`, `mastodon:`, `github:`) shows as a "Posted on" link.
  - Filter by source, source chips on cards (TBD).
  - Pages with post sources join the Posts collection (TBD).
- Pages
  - Folders are sections and notes are pages, whatever a folder holds. A post folder (a note + attachments) is a section with one page; attaching beside the note needs no folder.
  - `publish: off` keeps a page — and a folder's attachments when all its Markdown is unpublished — off the site. Hidden, not private: it stays in the source repo.
  - `params.excludeFolders` leaves whole folders out, likewise hidden not private. Links into them dangle.
  - `![alt](youtube-url)` embeds the video; `![alt](file.mp3)` (and other common audio) a player.
  - Relative media must sit beside the note or in a top-level media folder; otherwise it's left as written, with a build warning.
  - `![](page.md)` on its own line embeds that page, one level deep; inline it's a link. `#heading` section embeds (TBD).
  - A ` ```dataview ` block `LIST FROM #tag` (optional `LIMIT n`) embeds that tag's pages. Other Dataview queries stay code; multiple tags, `WHERE`, `SORT` (TBD).
- Date properties: convert YYYYMMDD to the required format (TBD).
- Chips show tags, categories and collections. Facet chips toggle include / exclude / off (`params.chipFacets`): click to include (again to clear), ✕ to exclude.

## Content Structure

```txt

_index.md, About.md                     (home + root pages)

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
- Backlinks ("Linked from") — link graph is cheap at sync; keep edges out of the list index, a count in it. Proposed: below the article, server-rendered from a sync data file — [features/backlinks.md](features/backlinks.md).
- Link weights, trust tiers — no data source yet; a subscriber-declared tier in subscription config is the honest v1 shape.
- Related pages by tag co-occurrence — the site index already holds the data.
- Remove Category Sidebar, linking to search until we have Category Pages

## Issues

- see `docs/wiki/issues.md`