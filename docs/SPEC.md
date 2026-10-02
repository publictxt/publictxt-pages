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
  - The sidebar lists sections by folder name, ordered by `params.sectionOrder`. (TBD-ISSUE)
  - Section index bodies render as prose and are search-indexed.
  - A `treeSections` folder with sub-folders shows its subtree below the index body (not search-indexed), sub-folders open one level, then the browse list. Both contents views below fold shut (open to start, not remembered).
  - A `timelineSections` folder (default blog, posts; the section and every sub-folder) whose list spans two or more months shows that list by date below the index body (not search-indexed): server-rendered, no JS, in the archive timeline's look — years on a rail, then months, with counts, titles after their day; the newest year and month open; year and month labels link to the browse list below at that date.
  - Collections: see [Collections](#collections) — a top-level section lists every page of its collection, wherever filed.
  - A folder's index (section page) is `_index.md`, Hugo's name — the only one; any depth, and the root's is home.
  - Sections move to specialised Views over Collections (TBD)
    - Blog view should show timeline like view - that toggles collections. eg. show microblogs/posts, show wiki, show notes, show bookmarks (TBD; a page's shared timeline does this for `timelineCollections`)
    - Bookmarks should show Bookmark specialised view (TBD)
    - Wiki view: a right-column panel of categories (TBD) and the folder tree (built: `treeSections`, below)
    - Panels per section, not one view each (TBD): a section lists its right-column panels in order (e.g. `panels: [tree, timeline]`), cascading from its `_index.md` like `order:` — so wiki/notes can keep a timeline beside the tree. Then `timelineCollections`/`timelineTags` fold into a `[params.timeline]` table, each panel its own partial. `treeSections` folds into `panels:` too; `tree/enabled.html`, its only reader, is the seam.
    - A non-log timeline (wiki, notes) may want `updated`, not `created`, as its date (TBD; timeline.js takes one date field throughout)
- Layout: left sidebar, content, right sidebar, up to a max width (`--layout-max`), centred beyond it
  - Header ☰ toggles the left sidebar: collapses it on wide screens (remembered per browser), a drawer on narrower ones. No JS: no button, the sidebar sits below the page.
  - One column on phones: filters fold above the results (open when one is set), page meta below the page.
- Left sidebar
  - Sections, categories, tag cloud
- Right sidebar — context for what's shown
  - widens into spare width (main keeps `--main-fit` first), up to `--aside-max`
  - page meta (collections, dates, categories, tags) on pages, then a timeline with titles (each after its day of the month, shown once per day): the page's year and month open, the page marked, year and month labels linking to a list at that date. Scope: pages of `timelineCollections` (default blog, posts) share one, with collection chips to narrow it (remembered per browser, carried into the links, which go to the home list); other pages their section's; root-level pages none. The shared timeline also gets a chip per `timelineTags` tag (default `journal`: blog entries of a special kind) that some of its pages have and some don't — a filter on that panel only, not a collection; remembered and carried alike.
  - pages of `treeSections` (default wiki) get a folder tree of their section instead of the timeline: server-rendered, no JS; folders then pages, A→Z; in the timeline's look (folders as its years, pages as its pages); open along the page's path, those folders' nodes filled, the page marked; other folders shut, with page counts. Folders only — a page filed elsewhere with `collections: wiki` isn't in it.
  - filters on browse lists and search, then a browse list's timeline; sort stays by the results
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
  - Home *Recent*: every page, recently updated first, `recentLimit` a page, with filters and timeline; nothing filtered to start. (Not "this month": empty on quiet months.)
  - Sorting in all by Date, Recency, Alphabetical.
  - A date sort groups the cards by that date's month: a heading per month — its node folds it (open to start, not remembered), pinned while its cards scroll, a rule out to its count ("4 of 9 pages" when split across pages); under a `created` sort it links to that month's date filter. A rating sort groups by stars, unrated where it sorts (as 2.5); no link, as the rating filter is a minimum. Title groups, and Search, TBD.
  - A Compact toggle beside sort (lists and Search): one line per card, remembered per browser, not in the URL.
  - Filter by Collection, and by Year (the `created` year) or a month of it (`?year=&month=`) — picked in the timeline; no year select.
  - Timeline panel below the filters (full lists spanning two or more months): years on a rail with a Jan–Dec sparkline, open to months with bars and counts — no titles, the list shows those. A year or month label picks the date filter; the other filters narrow it. The newest year open to start.
  - Filter by Category and Tag, as the facets above (also in Search)
  - Sort by Source/Author (TBD)
  - Sort (Top/Lowest rated, unrated as 2.5) and filter (minimum) by Rating, 1–5 `rating:` front matter (also in Search): chips, one at a time, each counting that rating or better.
  - Each filter section (Rating, Collection, Category, Tags; Search's Year too) shuts on its own, remembered per browser across lists and Search; a shut one shows how many values are picked.
- Search
  - Full text search
  - Collection, Year and Tag filters as 'facets' are available without a query
  - Year and month from the timeline, as the browse lists' (Pagefind's `month` filter counts); ranges (TBD)
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
  - `params.excludeFolders` in `settings/site.toml` leaves whole folders out, notes and attachments (e.g. `["settings/Templates"]`, with Obsidian's Templates plugin pointed at that folder; `settings/` itself isn't skipped, only `site.toml` is special there): paths from the repo root, case-insensitive. Like `publish: off`, hidden not private. Links into them dangle.
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
