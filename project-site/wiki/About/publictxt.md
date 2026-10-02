# PublicTxt

publictxt-pages is the publishing half of [PublicTxt](https://github.com/publictxt/publictext):
Git repositories as the storage and interchange layer for public knowledge — notes,
links, posts and wikis, kept as plain Markdown and shared the way code is.

## The idea

- **Plain text first** — files any editor opens, now and in twenty years
- **Git for history and sharing** — every change recorded; free hosting; anyone can
  clone, fork or follow along
- **Static sites for reading** — free to host, nothing to keep running
- **Obsidian compatible** — files round-trip with Obsidian set to Markdown links, and
  front matter follows Obsidian properties and Dataview fields

A central aim is **selective aggregation**: pulling chosen parts of other people's
PublicTxt repos into your own, to read, search and link across them. That happens
before publishing, in PublicTxt itself; publictxt-pages renders one repository. A
page's `source_repo:` front matter is kept for when aggregated content arrives, though
not shown yet.

## Folder conventions

publictxt-pages publishes any folders, but its defaults suit PublicTxt's:

| Folder | Holds |
|---|---|
| `blog/` | Dated posts, `YYYYMMDD-title.md`, in year (and month) folders |
| `posts/` | Short posts — toots, threads, micro-blogging |
| `wiki/` | Reference pages, read by place rather than date |
| `notes/` | Working notes |
| `bookmarks/` | One file per link, under `bookmarks/sites/<domain>/` |
| `indexes/` | Repo-wide indexes of links and tags |
| `settings/` | `site.toml`, and other settings |

This site follows them — compare its
[folder on GitHub](https://github.com/publictxt/publictxt-pages/tree/main/project-site)
with the sidebar.
