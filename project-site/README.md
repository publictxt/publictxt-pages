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
| [`settings/site.toml`](settings/site.toml) | The site's settings (not a page) |

## Rules

- **Link outside this folder by absolute GitHub URL**
  (`https://github.com/publictxt/publictxt-pages/blob/main/…`). The build sees only
  `project-site/`: a relative `../../deploy/…` works on GitHub but dangles on the site.
- Otherwise, plain PublicTxt conventions — the [writing guide](wiki/writing.md).

## Preview

From the repo root:

```bash
python scripts/build.py --source project-site          # full build -> public/
python scripts/build.py --source project-site --serve  # http://localhost:1313/
```
