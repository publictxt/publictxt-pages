# Project site

The content of publictxt-pages' own website: a PublicTxt source repo that happens to
live in a folder of this one. It's built with this checkout of publictxt-pages, so the
site always shows the generator as it is on `main`.

`README.md` files are never published — this one is for readers on GitHub.

## What's here

| Path | On the site |
|---|---|
| [`_index.md`](_index.md) | Home: the pitch, getting started, what readers get |
| [`wiki/`](wiki/_index.md) | The user guide — the only copy. Update it when a user-visible behaviour, setting or default changes |
| [`wiki/About/`](wiki/About/_index.md) | Background: how it works, PublicTxt, FAQ, contributing |
| [`blog/`](blog/_index.md) | The dev log, a post per milestone; dated by file name (`2026/20261002-….md`) |
| [`posts/`](posts/_index.md) | Short, one-feature updates; they share the blog's timeline |
| [`bookmarks/`](bookmarks/_index.md) | The tools it's built on, one file per link under `sites/<domain>/` |
| [`settings/site.toml`](settings/site.toml) | The site's settings (not a page) |

## Rules

- **Link outside this folder by absolute GitHub URL**
  (`https://github.com/publictxt/publictxt-pages/blob/main/…`). The build sees only
  `project-site/`: a relative `../../deploy/…` works on GitHub but dangles on the site.
- Otherwise, plain PublicTxt conventions — the [writing guide](wiki/writing.md).

## Publishing

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds this folder
and deploys it to GitHub Pages on every push to `main` — content and generator changes
alike — or from **Actions → Deploy project site → Run workflow**. It sets the base URL
from the repo's Pages settings, and the *Improve this page* links.

One-time: **Settings → Pages → Source: GitHub Actions**.

## Preview

From the repo root:

```bash
python scripts/build.py --source project-site          # full build -> public/
python scripts/build.py --source project-site --serve  # http://localhost:1313/
```
