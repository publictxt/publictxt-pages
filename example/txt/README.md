# Example PublicTxt repository

The default build source and the golden-test fixture (`tests/test_golden.py`). Each file
earns its place with a case the pipeline must handle; keep it that way — a new case, a
new (small) file, and a row in the table below. The content is about publictxt-pages
itself: each page explains the case it exercises, so the built site is a tour.

After changing anything here, refresh the snapshot, then read its diff before committing:

```bash
GOLDEN_UPDATE=1 python -m unittest tests.test_golden tests.test_site   # PowerShell: $env:GOLDEN_UPDATE=1; python -m unittest tests.test_golden tests.test_site; Remove-Item Env:GOLDEN_UPDATE
git diff tests/golden                                  # read it: every change should be one you meant
```

| Case | File(s) |
|---|---|
| Title from the first `# H1`, removed from the body | `wiki/Site/Search.md` |
| … with a line before the H1 | `wiki/Projects/PublicTxt/PublicTxt.md` |
| … `title:` set, so the H1 stays | `blog/20260915-a-post-with-full-front-matter.md` |
| Title from the file name (no H1) | `notes/sample.md`, `wiki/Site/Pagefind.md` |
| `created` from `YYYYMMDD` / `YYYY-MM-DD` in the name | `blog/20260509-…`, `blog/2024/2024-10-13-…`, `notes/Design notes/Why Git . 20240816.md` |
| `created` from a `YYYY/MM/DD/` path only | `blog/2023/12/17/another-post.md` |
| `created`/`updated` authored, with offsets | `blog/20260915-a-post-with-full-front-matter.md` |
| Quoted date-only `created:` | `blog/2026/20260925 Attachments beside the note - no post folders.md` |
| `_index.md` as folder index; links to it | `blog/_index.md`, `notes/_index.md`, `wiki/**/_index.md` |
| Folder with no index (generated) | `wiki/Projects/`, `wiki/Site/lists/` |
| Section `description:` (home card); an index with front matter only | top-level `*/_index.md`; `bookmarks/_index.md` |
| Link to a note with spaces in its name (`<…>` and `%20`) | `blog/_index.md` -> `blog/2026/20260925 Attachments…` |
| `publish: off` | `notes/unpublished.md` |
| … a folder with only unpublished Markdown: its files stay off too | `notes/Draft post/` |
| Spaces and dots in names; `.md` in a folder name | `wiki/Projects/PublicTxt/Other Software.md`, `Obsidian.md.md`, `bookmarks/sites/obsidian.md/` |
| Front matter fence with trailing space (`--- `) | `wiki/Pipeline/Dates.md`, `Hashtags.md`, `notes/Design notes/…` |
| Block, flow, scalar and quoted-`#` `tags:`; merged with hashtags | `wiki/Site/Pagefind.md`, `blog/20260915-…`, `bookmarks/sites/obsidian.md/Obsidian Publish.md` |
| Hashtags that are not tags: code, URL fragments, `issue #42`, `C#` | `wiki/Pipeline/Hashtags.md`, `Dates.md`, `wiki/Site/Search.md` |
| `categories:` / `category:`, `rating:`, `collections:` | `blog/20260509-…`, `blog/20260915-…`, `online-things.md` |
| `bookmark:` / `bookmarks:`, in and outside `bookmarks/` | `bookmarks/sites/gohugo.io/gohugo.io.md`, `wiki/Projects/PublicTxt/Obsidian.md.md`, `wiki/Site/Pagefind.md` |
| Post sources (`mastodon:`, `substack:` list) | `blog/20260915-a-post-with-full-front-matter.md` |
| Custom keys passed through | `online-things.md` (`web:`), `wiki/Site/Pagefind.md` (`web-links:`) |
| YouTube and audio embeds in image syntax; note embed `![](page.md)`, and inline as a link | `notes/embeds.md` |
| ` ```dataview ` tag list, with `LIMIT`; unsupported query left as code | `notes/tag-lists.md` |
| `[[wikilinks]]`, dangling and cross-section links | `Roadmap.md`, `wiki/Projects/PublicTxt/*`, `blog/2023/12/17/20231217.md` |
| Root-level pages | `_index.md`, `Roadmap.md`, `online-things.md` |
| Skipped: this README, `LICENSE`, `CNAME`, `.obsidian/` | — |
| Non-Markdown copied verbatim | `media/icon.png`; beside a note in a section, `notes/pipeline.png` |
| An image beside a post (no post folder); Obsidian's pasted name, `%20` in the link | `blog/2026/Pasted image 20260925101500.png` |
| Site settings, not content | `settings/site.toml` |
