# PublicTxt-Hugo

Static site interface for browsing/searching an Obsidian-style Markdown repository (PublicTxt or otherwise). Hugo + Pagefind.

See `SPEC.md` for the full v1 spec.

## Requirements

- **Hugo extended v0.158 or later (tested on v0.163.2)** — the OS-packaged Hugo on many distros (apt/dnf) may be older; verify with `hugo version` and check for "extended" in the output. Install a current release via Homebrew, winget, or the GitHub releases page if your package manager's version is stale.
- Pagefind — either `npx pagefind` (Node.js) or the [standalone binary](https://github.com/Pagefind/pagefind/releases) (no Node needed)

## Authoring requirement

In Obsidian: **Settings → Files and Links**
- "Use [[Wikilinks]]": **off**
- "New link format": **Relative path to file**

This makes links portable — they work both in Obsidian, browsing the repo on GitHub, and once built by Hugo.

## Build

```bash
python3 scripts/extract_hashtags.py content   # merge inline #hashtags into front matter
hugo --minify                                    # build site to public/
npx pagefind --site public                        # build search index (or: pagefind --site public)
```

Order matters — Pagefind indexes rendered HTML, so Hugo must run first.

## Local preview

```bash
hugo server -D
```

Note: Pagefind's index/UI only exists after a full `hugo build` + `pagefind` run — `hugo server`'s live-reload preview won't have working search until you do a full build once.

## Content

Add Markdown files under `content/wiki/`, `content/blog/<year>/<month>/`, `content/notes/`, or `content/metaweb/<domain>/`. See existing files for the front matter contract.
