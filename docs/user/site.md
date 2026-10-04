# The published site

What your readers get — and what your writing choices turn into.

- [Layout](#layout)
- [Home](#home)
- [Section pages](#section-pages)
- [Browse lists: sort and filter](#browse-lists-sort-and-filter)
- [The list timeline](#the-list-timeline)
- [On a page](#on-a-page)
- [Tags](#tags)
- [Search](#search)
- [Phones, and no JavaScript](#phones-and-no-javascript)

## Layout

Three columns, centred on wide screens:

| Left: navigation | Middle: content | Right: context |
|---|---|---|
| Sections, Search, Tags; categories with counts | The page or list | On a page: its details and timeline or folder tree. On a list: filters and timeline |

**☰** in the header collapses the left column on wide screens (remembered), or opens it
as a drawer on narrower ones.

## Home

Your root `_index.md` (or, without one, the site description), then **Recent**: every
page, most recently updated first, with the full filters and timeline beside it.

## Section pages

`/blog/`, `/wiki/`, and every sub-folder:

1. The folder's `_index.md` text
2. For a [tree section](configuration.md#timeline-and-folder-tree) (default `wiki`): its
   sub-folders, one level open
3. The browse list — for a top-level section, every page in its
   [collection](writing.md#collections), wherever filed; for a sub-folder, only what's
   filed under it

Breadcrumbs above every page but home trace the folders.

## Browse lists: sort and filter

Home, section and tag lists share one interface.

**Sort**: Newest, Oldest, Title, Recently updated, Top/Lowest rated (unrated counts as
2.5). Starts at the [configured order](configuration.md#browse-lists).

**Compact**, beside sort: one line per page — title, date, stars — for skimming. Remembered
in your browser for lists and search; not part of the URL.

**Filter chips** — Collection, Category, Tags (as [configured](configuration.md#filter-chips)):

- Click a chip to **include** it; click again to clear.
- Click its **✕** to **exclude** it (shown on hover, focus, or once set).
- Several included: **all** (pages with every one) or **any**, via the toggle.
- **Rating** chips: one at a time, each meaning "this many stars or more".
- Each filter group folds; a folded group shows how many values are picked. Folds are
  remembered across lists and search.
- **Tags** holds two kinds: the list's own tags above, which filter, then, past a rule,
  **Other tags** — popular tags no page in the list carries, which link to their tag
  pages. A filter chip's tooltip gives its site-wide count. Without JavaScript the column
  shows the tag cloud as links.

**Every list state is in the URL** — sort, chips, page, date. Copy the address to share
exactly what you see.

## The list timeline

Below the filters, on lists spanning two or more months:

- Years on a rail, each with a Jan–Dec sparkline; the newest open.
- Open a year for its months, with bars and counts.
- Click a year or month to filter the list to it; the other filters still apply.

Dates here are `created` — see [Dates](writing.md#dates).

## On a page

Right column, top: **this page's details** —

- collections, created and updated dates, categories, rating stars, tags
- the bookmark link, if any; "Posted on" links to where it was cross-posted

Below that, **where it sits**:

- **Timeline** — the page's section, by date, with titles; its year and month open, the
  page marked; year and month labels link to the list at that date. Pages in
  [`timelineCollections`](configuration.md#timeline-and-folder-tree) (default `blog`,
  `posts`) share one timeline, with a chip per collection — and per `timelineTags` tag —
  to narrow it.
- **Folder tree** — for tree sections (default `wiki`): folders then pages, A→Z, open
  along the page's path. Reference material is read by place, not date.

Root-level pages get neither.

Footer: **Improve this page** opens the note in your repo's GitHub editor (if the
workflow sets `HUGO_PARAMS_EDITURL`).

## Tags

- `/tags/` — every tag.
- `/tags/<tag>/` — a browse list of that tag's pages, with filters.
- Inline `#hashtags` in a page link to their tag page.

## Search

The **Search** page: full text over every page and section intro, with:

- Collection, Category, Tag and Rating filters — usable with no query, to browse
- Year and month from the timeline
- The same sorts as browse lists

*More* loads further results. Search runs in the browser ([Pagefind](https://pagefind.app));
nothing is sent to a server.

## Phones, and no JavaScript

- **Phones** (below 900px): one column, content first. The right column becomes a drawer,
  opened by a header button named for it — **Filters** on lists and search (with a count
  of filters set; while open it reads "Show 12 pages" and closes the drawer), **This
  page** on pages. ☰ opens the left column the same way; one drawer at a time.
- **No JavaScript**: pages, navigation and the folder tree all work; lists fall back to
  plain links without filters; search needs JavaScript. On phones the right column
  follows the content.
