# Spec

What the site does and should do. Implementation lives in [`docs/wiki/`](wiki/index.md) —
read that before the source. Reasoning is in [`docs/wiki/decisions/`](wiki/decisions/DECISIONS.md),
cited as *(Dn)*.

Items marked **(TBD)** are not built.

## Principles

- **No PublicTxt.Syntax / .NET dependency.** Works with real wikis: relative links, no front matter required.
- Source repo never modified; build operates on generated copy `build/content/`.
- Links are `[label](../wiki/page.md)` - No `[[wikilinks]]`
- Hugo renders `.md` extensions to `.html`

## Feature list

- Sections
  - Single repo;  top-level folders are sections (`wiki/`, `blog/`, `notes/`, `bookmarks/`, `posts/`, …). Root-level `.md` → plain pages.
  - home list sections by folder name, ordered by `params.sectionOrder` *(D10)*.
  - Section index bodies render as prose and are search-indexed.
- Sidebar
  - Tag cloud
  - page meta (type, dates, tags) in sidebar.
  - Author **(TBD)** — carried in front matter, rendered nowhere
- Categories
  - One `category:` per page from a closed list in `hugo.toml`; feature toggleable *(D11)*.
  - Category pages / sidebar list (TBD)
- Tags
  - Inline `#hashtags` merged into `tags`. Facets: tags (AND-able), type.
  - tag pages
- Browse Lists
  - All browse lists (home *Recent*, sections, tag pages) rendered client-side from one site-wide JSON index; plain `<ul>` no-JS fallback *(D6, D7)*.
  - Sorting in all by Date, Recency, Alphabetical.
  - Filter by Type, and by Year (the `created` year). 
  - Filter by Category (also in Search)
  - Sort by Source/Author (TBD)
  - Sort and Filter by Rating (TBD)
- Search
  - Full text search
  - Type, Year and Tag filters as 'facets' are available without a query
  - Finer date filters — month, ranges (TBD)
  - Also Sortable
- Breadcrumbs from `.Ancestors` on all pages but home; folder names, date folders literal.
- Bookmarks
  - frontmatter 'bookmark' properties merged with bookmarks in section, without moving the page
- Pages
  - A post folder (one Markdown file + attachments, no subfolders) converts to a Hugo leaf bundle: the Markdown becomes the page, attachments become its page resources.

## Content Structure

```txt

index.md, Projects.md                   (home + root pages)

wiki/index.md, wiki/A/index.md          (folder index = section page (any depth))

blog/2023/12/17/x.md                    (dates derived from path)
blog/2024/home.md                       (home.md also acts as folder index)
blog/20260509-title.md                  (YYYYMMDD prefix date)
blog/2024/09/20240922-title.md          (YYYYMMDD prefix date)
blog/2026/09/22/Post-Name/title.md & blog/2026/09/22/Post-Name/image.png     (converts to Hugo content bundle)

bookmarks/sites/domain/page.md     (one file per resource)

posts/post-name.md
notes/note-name.md

media/                             (non-Markdown copied verbatim)

README*, LICENSE*, CNAME, .git/    (skipped during sync)

```

## Front Matter Reference

All front matter optional; sync derives the rest.

| Key                     | Purpose                    | Notes                                                                           |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `title`                 | Page title                 | Falls back to first H1 (removed from body), then filename                       |
| `type`                  | Override folder-based type | Defaults to top-level folder name                                               |
| `tags`                  | Inline or block list       | Merged with `#hashtags`; deduplicated                                           |
| `created`               | ISO 8601 datetime          | Derived from path, git, mtime, or build time if not set                         |
| `updated`               | ISO 8601 datetime          | Derived from git, mtime, or build time if not set; never earlier than `created` |
| `author`, `source_repo` | Metadata                   | Passed through; not filterable                                                  |
| `bookmark`, `bookmarks` | URL or list                | Merges page into bookmarks section                                              |
| `source_path`           | Path in the source repo    | Written by sync; with `params.editURL`, drives the footer "Edit this page" link |

Other keys pass through unchanged. `hugo.toml` maps `created` → `.Date`, `updated` → `.Lastmod`.

## Deployment

Build outputs to `public/`. GitHub Actions workflow (`deploy/publish-to-github-pages.yml`) checks out the content repo, runs the build pipeline, and deploys via `actions/deploy-pages`.
