# How it works

publictxt-pages turns a folder of Markdown into a website in three steps. Nothing runs
on a server afterwards: the result is HTML, CSS, a little JavaScript and a search index,
served as plain files.

```txt
 your repo ──▶ 1. sync ──▶ 2. Hugo ──▶ 3. Pagefind ──▶ public/ ──▶ GitHub Pages
 Markdown      prepare     render      index search    static files
```

## 1. Sync: prepare the notes

A Python script copies your repo to a working folder — it never changes the original —
and fills in what you didn't write:

- **Titles** — `title:`, else the first `# Heading`, else the file name
- **Dates** — `created:`, else a date in the file name or folders, else Git: the commit
  that added the file, and the last one that changed it
- **Tags** — inline `#hashtags` merged with front matter `tags:`, and turned into links
- **What to leave out** — `README.md`, `LICENSE`, `.obsidian/`, pages marked
  `publish: off`, and folders listed in `excludeFolders`

Images and other files are copied along with the notes.

## 2. Hugo: render the site

[Hugo](https://gohugo.io) builds a page for every note, folder and tag, with the
publictxt-pages templates. Along the way:

- relative `.md` links become links between pages
- images stay images; audio files and YouTube links become players
- `![](note.md)` on its own line embeds that note, as Obsidian does
- a small subset of Dataview, `LIST FROM #tag`, becomes a list of pages

Hugo also writes one index of every page — title, dates, tags, collections — for the
browse lists to read.

## 3. Pagefind: index for search

[Pagefind](https://pagefind.app) reads the finished pages and writes a search index cut
into small pieces. The search page fetches only the pieces a query needs, which is how
full-text search works on a static host with no search server.

Pagefind skips a page it can't sort or filter without saying so, so the build checks
the index afterwards and fails if any page is missing — better a failed build than a
site with gaps in its search.

## In the browser

Lists, filters, timelines and search run in the reader's browser, from those two
indexes. Every list's state — sort, filters, page, date — is kept in the URL, so a link
shares exactly what you see. Without JavaScript, pages, navigation and folder trees
still work; lists fall back to plain links.

## Where the build runs

Usually in a GitHub Action in your content repo: it checks out your notes with their
full history (for the dates), fetches publictxt-pages, builds, and deploys to GitHub
Pages. Your repo holds your notes and one workflow file.

The same build runs on your own machine for a preview — Python, Hugo and Pagefind,
nothing else. See [Setup](../setup.md#optional-preview-locally).
