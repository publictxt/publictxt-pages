# PublicTxt — what this repo serves

Excerpt of the parent project's README, kept to what bears on this repo. The
source of truth is [github.com/publictxt/publictext](https://github.com/publictxt/publictext).

## The project

Git repositories as storage and interoperability layer for public knowledge: plain
Markdown, free Git hosting, static sites. A key feature is **selective aggregation**:
pulling chosen subsets of other people's PublicTxt repos into a local aggregate view.

This repo is the **Static Website Generation** part: push to a Pages-enabled repo and
you're live. Aggregation is upstream's job; this renders one content directory, but
`source_repo` in front matter is where aggregated content would show.

## Constraints it inherits

- **Plain text first**: md-wiki links (`[text](page.md)`)
- **Obsidian compatible**: files round-trip with Obsidian set to Markdown links;
  front matter aims to match Obsidian / DataView attributes.
- **Zero cost**: free Git hosting and static Pages; no backend.

## Repo layout it should expect

v1 folders:

- `bookmarks/`
- `blog/` (`YYYY/MM/YYYYMMDD-title.md`),
- `wiki/`,
- `notes/`,
- `media/`,
- `tags/`,
- `indexes/`  (repo-wide indexes),
- `settings/` (site.toml)
