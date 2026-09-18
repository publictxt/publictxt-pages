# PublicTxt-Hugo

Static site interface for browsing/searching an Obsidian-style Markdown repository (PublicTxt or otherwise). Hugo + Pagefind.

See `SPEC.md` for the full v1 spec.

## Requirements

- **Hugo v0.158 or later** (plain or extended — this site uses only plain CSS, no Sass, so the smaller non-extended binary works). The OS-packaged Hugo on many distros (apt/dnf) may be older; verify with `hugo version`. Install a current release via Homebrew, winget, or the GitHub releases page if your package manager's version is stale.
- Pagefind — either `npx pagefind` (Node.js) or the [standalone binary](https://github.com/Pagefind/pagefind/releases) (no Node needed)

## Authoring requirement

In Obsidian: **Settings → Files and Links**

- "Use [[Wikilinks]]": **off**
- "New link format": **Relative path to file**

This makes links portable — they work both in Obsidian, browsing the repo on GitHub, and once built by Hugo.

## Content source

The build takes a PublicTxt repo directory as input — by default `example/txt/`, a synthetic repo that exhibits every quirk found in real ones (see its README). To build your own repo, clone it anywhere (`txt/` in this folder is gitignored for that purpose) and pass the path to the build script.

Hugo does **not** read the repo directly: `scripts/sync_content.py` copies it to `build/content/` (mounted as Hugo's content, together with the site-owned `site-content/` that holds the search page), normalising what Hugo can't handle natively:

- `index.md` / `home.md` in a folder → `_index.md` (otherwise Hugo treats the folder as a leaf bundle and hides its sibling pages); folders with no index page at all get a minimal one, so every folder is browsable and appears in breadcrumbs
- missing `title:` → taken from the first `# H1` (removed from the body), else the filename
- missing `created:` / `updated:` → **every** page gets both: `created` from a date in the
  filename/path, else the file's first Git commit, else its file times, else the build time;
  `updated` from its last Git commit, else its mtime. The rung `created` came from is recorded
  as `created_source:`. Lists everywhere sort on `updated`. Section indexes inherit their
  newest descendant's `updated`. Legacy `date:` / `lastmod:` are accepted and renamed.
- inline `#hashtags` → links to their tag page (text stays `#hashtag`; code, links and URL fragments are left alone)
- repo housekeeping files (`README`, `LICENSE`, `CNAME`, `.obsidian/`, …) skipped

Front matter, when present, is preserved. A page anywhere with `bookmark: <url>` in its front
matter (or `bookmarks:`, a URL or a list) is also listed in the Bookmarks section, with the URL
shown as an external link on its card, header and sidebar.

## Lists: order and pagination

Section and tag pages list their pages most recently *updated* first, 20 per page, with a pager
below the list. Both are set in `hugo.toml`:

- `pagination.pagerSize` — pages per list page
- `params.listOrder` — the default order: `updated`, `created` or `title`, optionally followed by
  `asc` or `desc` (`"created asc"` is oldest first; dates default to newest first, titles to A→Z)

A section's index page can choose its own order, which also applies to its sub-folders:

```yaml
---
order: title
---
# wiki home
```

The example repo's `wiki/index.md` does this, so the wiki reads A→Z while the blog stays newest first.

## Build

```bash
scripts/build.sh                      # Linux/macOS — builds example/txt
scripts/build.sh --source ../my-txt-repo       # any PublicTxt repo directory
HUGO_BASEURL=https://example.org/ scripts/build.sh --source txt
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

Note: Pagefind's index/UI only exists after a full build + `pagefind` run — do that once first, then start the server. It won't pick up content edited after that until you rebuild.

If you run `hugo server` by hand, pass both `-M` (`--renderToMemory`) **and** `--renderStaticToDisk`. Hugo renders pages to disk by default, overwriting `public/`'s built HTML with dev-mode markup that points at an unfingerprinted stylesheet — those pages then appear unstyled when the built site is served next; `-M` keeps that render in memory instead. But `-M` alone also stops the server serving anything Hugo didn't render itself, and Pagefind's index is such a thing — it's written straight into `public/pagefind/` by the separate `pagefind` CLI step, outside Hugo's content/static/assets pipeline. `--renderStaticToDisk` is what still lets the server serve it from disk. The build scripts already pass both; a plain `hugo` build afterwards also repairs any damage from running the server without `-M`.

## Publishing a content repo (GitHub Pages)

Keep the content repo pure Markdown; let a workflow *in the content repo* fetch this generator at build time. Copy [`deploy/publish-to-github-pages.yml`](deploy/publish-to-github-pages.yml) to `.github/workflows/publish.yml` in the content repo, set `HUGO_BASEURL` to your domain, and switch the repo's **Settings → Pages → Source** to *GitHub Actions*. Custom domains stay configured in Pages settings; the `CNAME` file is skipped by the sync step.
