# Example PublicTxt repository

The default build source and the golden-test fixture (`tests/test_golden.py`). Each file
earns its place with a case the pipeline must handle; keep it that way — a new case, a
new (small) file, and a row in the table below.

After changing anything here, refresh the snapshot, then read its diff before committing:

```bash
GOLDEN_UPDATE=1 python -m unittest tests.test_golden tests.test_site   # PowerShell: $env:GOLDEN_UPDATE=1; python -m unittest tests.test_golden tests.test_site; Remove-Item Env:GOLDEN_UPDATE
git diff tests/golden                                  # read it: every change should be one you meant
```

| Case | File(s) |
|---|---|
| Title from the first `# H1`, removed from the body | `wiki/Science/Cosmology.md` |
| … with a line before the H1 | `wiki/Projects/PublicTxt/PublicTxt.md` |
| … `title:` set, so the H1 stays | `blog/20260915-a-post-with-full-front-matter.md` |
| Title from the file name (no H1) | `notes/sample.md`, `wiki/Science/Kurzgesagt.md` |
| `created` from `YYYYMMDD` / `YYYY-MM-DD` in the name | `blog/2024/20241013-…`, `blog/20260509-…`, `notes/Info politics/The WhatsApp Mess . 20240816.md` |
| `created` from a `YYYY/MM/DD/` path only | `blog/2023/12/17/another-post.md` |
| `created`/`updated` authored, with offsets | `blog/20260915-a-post-with-full-front-matter.md` |
| Quoted date-only `created:` | `blog/20260925 Another Issue with the Fermi Paradox - the Barrow Scale.md` |
| `_index.md` as folder index; links to it | `blog/_index.md`, `notes/_index.md`, `wiki/**/_index.md` |
| Folder with no index (generated) | `bookmarks/`, `wiki/Projects/`, `wiki/Science/brain/` |
| Post folder -> leaf bundle | `blog/20260921-TechnoPolitics/` |
| Links to a post folder's note by name (`<…>` and `%20`) | `blog/_index.md` |
| `publish: off` | `notes/unpublished.md` |
| Spaces and dots in names; `.md` in a folder name | `wiki/Projects/PublicTxt/Other Software.md`, `Obsidian.md.md`, `bookmarks/sites/obsidian.md/` |
| Front matter fence with trailing space (`--- `) | `wiki/Computer-Science/CopyLeft.md`, `Free-Software.md`, `notes/Info politics/…` |
| Block, flow, scalar and quoted-`#` `tags:`; merged with hashtags | `wiki/Science/Kurzgesagt.md`, `wiki/Projects/PublicTxt/CuratedCommons.md`, `bookmarks/sites/obsidian.md/Obsidian Web Clipper Plugin.md` |
| Hashtags that are not tags: code, URL fragments, `issue #42`, `C#` | `wiki/Computer-Science/Free-Software.md`, `CopyLeft.md`, `wiki/Science/Cosmology.md` |
| `categories:` / `category:`, `rating:`, `collections:` | `blog/20260509-…`, `blog/20260915-…`, `online-things.md` |
| `bookmark:` / `bookmarks:`, in and outside `bookmarks/` | `bookmarks/sites/gitcms.dev/gitcms.dev.md`, `wiki/Projects/PublicTxt/Obsidian.md.md`, `wiki/Science/Kurzgesagt.md` |
| Post sources (`mastodon:`, `substack:` list) | `blog/20260915-a-post-with-full-front-matter.md` |
| Custom keys passed through | `online-things.md` (`web:`), `wiki/Science/Kurzgesagt.md` (`web-links:`) |
| YouTube and audio embeds in image syntax; note embed `![](page.md)`, and inline as a link | `notes/embeds.md` |
| ` ```dataview ` tag list, with `LIMIT`; unsupported query left as code | `notes/tag-lists.md` |
| `[[wikilinks]]`, dangling and cross-section links | `Projects.md`, `wiki/Projects/PublicTxt/*`, `blog/2023/12/17/20231217.md` |
| Root-level pages | `_index.md`, `Projects.md`, `online-things.md` |
| Skipped: this README, `LICENSE`, `CNAME`, `.obsidian/` | — |
| Non-Markdown copied verbatim | `media/favicon-180.png`; beside a note in a section, `notes/dot.png`; as a bundle attachment, `blog/20260921-TechnoPolitics/*.jpg` |
| Site settings, not content | `settings/site.toml` |
