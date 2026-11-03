# publictxt-pages

Statically-hosted web interface for [PublicTxt](https://github.com/publictxt/publictext) repos — deployable
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

## Build setup

### 1. Tools

| Tool | Version | Notes |
| --- | --- | --- |
| **Python** | 3.11+ | stdlib only — no `pip install` |
| **Hugo** | 0.162+, **standard edition** | Extended isn't needed (plain CSS, no Sass; `js.Build` is in standard) but works too. Distro packages are often too old |
| **Pagefind** | 1.5.2 (pinned in `build.py`) | Binary on `PATH`; if absent, the build runs `npx pagefind@1.5.2`, which needs **Node** |
| Node | 22+ | Only for the JS tests, or as the Pagefind fallback |

Hugo: download `hugo_<version>_<os>-<arch>` from the
[releases](https://github.com/gohugoio/hugo/releases) and put it on `PATH`.
Pagefind: `pagefind-v1.5.2-<arch>-<os>` from its
[releases](https://github.com/Pagefind/pagefind/releases), or skip it and rely on Node.
On a fresh Linux box/container, `sudo scripts/cloud-setup.sh` installs both to
`/usr/local/bin`.

Check:

```bash
python --version     # 3.11+
hugo version         # v0.162.1 or later
pagefind --version   # pagefind 1.5.2 — or: node --version
```

### 2. Build

```bash
python scripts/build.py                        # builds example/txt -> public/
python scripts/build.py --source ../my-repo    # your own PublicTxt repo
python scripts/build.py --serve                # local preview at http://localhost:1313/
```

`build.py` runs the whole pipeline: sync content → `hugo --minify` → Pagefind index →
check the index. Any OS (`python3` where `python` is Python 2). Relative `--source`
paths are from this repo's root. Flags: `--help`. `--serve` needs a prior full build for
search, and a re-run for content changes.

## Authoring in Obsidian

**Settings → Files and Links**: "Use [[Wikilinks]]" **off**, "New link format"
**Relative path to file**. Keeps links working in Obsidian, on GitHub, and once built.

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
