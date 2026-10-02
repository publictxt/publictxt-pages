# publictxt-pages

**Publish a folder of Markdown notes as a browsable, searchable website — free, with no
server.**

Write in [Obsidian](https://obsidian.md) or any editor and push to GitHub. A GitHub
Action turns your notes into a static site — sections, tags, timelines, filters and
full-text search — and publishes it on GitHub Pages. Your repo stays plain Markdown: no
theme to install, no build files to maintain.

## Get started

1. [Create a content repo](wiki/setup.md#1-create-the-content-repo) and open it in Obsidian
2. [Copy in one workflow file](wiki/setup.md#5-add-the-publish-workflow)
3. [Turn on GitHub Pages and push](wiki/setup.md#6-turn-on-github-pages-and-push)

About fifteen minutes, start to finish — the [setup guide](wiki/setup.md) walks through it.

## What readers get

- **Sections** from your top-level folders, in the order you choose
- **Browse lists** by date, title or rating, grouped by month or stars; filter by
  collection or tag, include or exclude — and share exactly what you see, by URL
- **Timelines** beside logs and journals, **folder trees** beside reference notes
- **Full-text search** that runs in the browser, with the same filters
- **Tags**, bookmarks, ratings, and audio, YouTube and note embeds
- Pages that work on phones, and without JavaScript

A tour: [The published site](wiki/site.md).

## What you write

Ordinary Markdown in folders. The build works out the rest:

- **Titles** from the first heading or the file name
- **Dates** from the file name or Git history — you rarely type one
- **Tags** from inline `#hashtags`, as well as front matter
- **Links** as relative Markdown links, which work in Obsidian, on GitHub and on the site

Front matter is optional throughout. The details: [Writing](wiki/writing.md).

## Why plain text in Git

- **Free** — GitHub Pages hosting; no server, database or subscription
- **Yours** — readable in any editor, every change in history, and nothing to export
  when you leave
- **Compatible** — no Obsidian plugin, no special syntax; notes round-trip unchanged

publictxt-pages is the publishing half of [PublicTxt](wiki/About/publictxt.md):
Git repositories as a home for public knowledge.

## This site

Built by publictxt-pages from the
[`project-site/`](https://github.com/publictxt/publictxt-pages/tree/main/project-site)
folder of its own repository — the same pipeline, nothing extra. The user guide is the
[wiki](wiki/_index.md), and how it all fits together is [About](wiki/About/_index.md).
What's new is in the [blog](blog/_index.md) and [posts](posts/_index.md); the tools it's
built on are in [bookmarks](bookmarks/_index.md).
