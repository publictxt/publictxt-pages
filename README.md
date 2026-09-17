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

## Content source

The build takes a PublicTxt repo directory as input — by default `example/txt/`, a synthetic repo that exhibits every quirk found in real ones (see its README). To build your own repo, clone it anywhere (`txt/` in this folder is gitignored for that purpose) and pass the path to the build script.

Hugo does **not** read the repo directly: `scripts/sync_content.py` copies it to `build/content/` (Hugo's `contentDir`), normalising what Hugo can't handle natively:

- `index.md` / `home.md` in a folder → `_index.md` (otherwise Hugo treats the folder as a leaf bundle and hides its sibling pages)
- missing `title:` → taken from the first `# H1` (removed from the body), else the filename
- missing `date:` on blog posts → from a `YYYYMMDD` filename prefix or a `blog/YYYY/MM/DD/` path
- repo housekeeping files (`README`, `LICENSE`, `CNAME`, `.obsidian/`, …) skipped

Front matter, when present, is preserved.

## Build

```bash
scripts/build.sh                      # Linux/macOS — builds example/txt
scripts/build.sh ../my-txt-repo       # any PublicTxt repo directory
HUGO_BASEURL=https://example.org/ scripts/build.sh txt
.\scripts\build.ps1                   # Windows
.\scripts\build.ps1 -Source txt -BaseUrl https://example.org/
```

Which runs, in this mandatory order:

```bash
python3 scripts/sync_content.py example/txt build/content   # copy + normalise source repo
python3 scripts/extract_hashtags.py build/content     # merge inline #hashtags into front matter
rm -rf public && hugo --minify                         # build site to public/ (clean first — Hugo won't remove stale pages)
pagefind --site public                                 # build search index (or: npx pagefind --site public)
```

Pagefind indexes rendered HTML, so Hugo must run first.

## Local preview

```bash
scripts/build.sh --serve      # or: .\scripts\build.ps1 -Serve
```

Note: Pagefind's index/UI only exists after a full build + `pagefind` run — `hugo server`'s live-reload preview won't have working search until you do a full build once.

## Publishing a content repo (GitHub Pages)

Keep the content repo pure Markdown; let a workflow *in the content repo* fetch this generator at build time. Copy [`deploy/publish-to-github-pages.yml`](deploy/publish-to-github-pages.yml) to `.github/workflows/publish.yml` in the content repo, set `HUGO_BASEURL` to your domain, and switch the repo's **Settings → Pages → Source** to *GitHub Actions*. Custom domains stay configured in Pages settings; the `CNAME` file is skipped by the sync step.
