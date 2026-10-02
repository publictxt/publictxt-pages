# First build: Markdown in, a searchable site out

publictxt-pages built its first site today, in the shape it has kept since: a Python
step prepares a copy of the notes, #hugo renders them, and #pagefind indexes them for
#search. Three tools, run once per push, and nothing left running afterwards.

Also in the first day:

- **Inline hashtags become tags.** Write `#topic` anywhere in a note and the page is
  tagged — as in Obsidian, with no front matter needed.
- **Pick several tags in search** without typing a query, to browse rather than look up.
- **Breadcrumbs** on every page, from the folders above it.
- **A GitHub Actions workflow** that publishes a content repo to GitHub Pages: the repo
  holds only notes, and the workflow fetches publictxt-pages to build them.
- **Plain Hugo.** The theme needs no Sass, so the standard Hugo download is enough —
  not the extended edition.

The [workflow](../../wiki/setup.md#5-add-the-publish-workflow) and the
[pipeline](../../wiki/About/how-it-works.md) are much the same today.
