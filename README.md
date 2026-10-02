# publictxt-pages

Statically-hosted web interface for [PublicTxt](../publictxt) repos — deployable
to GitHub/GitLab Pages for free, with no backend required.

Python preprocessing + Hugo build produce the static site; a dynamic
client-side layer (Pagefind + JS) adds full-text search and faceted
tag/collection browsing on top.

Works directly against a standard Obsidian-style Markdown vault —
relative links, inline `#hashtags`, and folder-derived collections — with
minimal reliance on PublicTxt-specific syntax transforms.

## docs

- [docs/user/](docs/user/README.md) — **user guide**: setup with Obsidian, configuration, writing, the published site
- [docs/SPEC.md](docs/SPEC.md) — what it does and should do
- [docs/wiki/](docs/wiki/index.md) — the file map, and traps that span files

## Requirements

- **Hugo v0.158+** (plain works — no Sass). Distro packages are often stale; check
  `hugo version`.
- **Python 3.10+** — no packages.
- **Pagefind 1.5.2** (pinned in `build.py`) — the [standalone binary](https://github.com/Pagefind/pagefind/releases)
  on `PATH`, else the scripts fetch it with `npx` (Node).

## Authoring in Obsidian

**Settings → Files and Links**: "Use [[Wikilinks]]" **off**, "New link format"
**Relative path to file**. Keeps links working in Obsidian, on GitHub, and once built.

## Quickstart

```bash
python scripts/build.py                        # builds example/txt -> public/
python scripts/build.py --source ../my-repo    # your own PublicTxt repo
python scripts/build.py --serve                # local preview
```

Any OS (`python3` where `python` is Python 2). Relative `--source` paths are from this
repo's root. Flags: `--help`. `--serve` needs a prior full build for search, and a
re-run for content changes.

## Tests

```bash
python -m unittest                    # stdlib only; CI runs both on push and PR
node --test "tests/js/*.test.mjs"     # browser modules' logic; Node 22+, no packages
```

`tests/golden/` is a snapshot of the pipeline's output over `example/txt/`. After an
intended change to either, refresh it and review the diff:

```bash
GOLDEN_UPDATE=1 python -m unittest tests.test_golden tests.test_site   # PowerShell: $env:GOLDEN_UPDATE=1; python -m unittest tests.test_golden tests.test_site; Remove-Item Env:GOLDEN_UPDATE
git diff tests/golden                                  # read it: every change should be one you meant
```

## Publishing (GitHub Pages)

Keep the content repo pure Markdown; a workflow *in that repo* fetches this generator
at build time. Copy [`deploy/publish-to-github-pages.yml`](deploy/publish-to-github-pages.yml)
to `.github/workflows/publish.yml` there, set `HUGO_BASEURL`, and switch that repo's
**Settings → Pages → Source** to *GitHub Actions*.

Per-site settings: `HUGO_*` env vars on its Build step, or the content repo's
`settings/site.toml` (commented example: `example/txt/settings/site.toml`). Keep
`fetch-depth: 0` — page dates come from Git history.
