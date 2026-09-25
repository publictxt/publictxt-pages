# publictxt-pages

Statically-hosted web interface for [PublicTxt](../publictxt) repos — deployable
to GitHub/GitLab Pages for free, with no backend required.

Python preprocessing + Hugo build produce the static site; a dynamic
client-side layer (Pagefind + JS) adds full-text search and faceted
tag/type browsing on top.

Works directly against a standard Obsidian-style Markdown vault —
relative links, inline `#hashtags`, and folder-derived types — with
minimal reliance on PublicTxt-specific syntax transforms.

## docs

- [docs/SPEC.md](docs/SPEC.md) — what it does and should do
- [docs/wiki/](docs/wiki/index.md) — how it works
- [docs/wiki/decisions/](docs/wiki/decisions/DECISIONS.md) — why

## Requirements

- **Hugo v0.158+** (plain works — no Sass). Distro packages are often stale; check
  `hugo version`.
- **Pagefind** — `npx pagefind` (Node) or the [standalone binary](https://github.com/Pagefind/pagefind/releases).

## Authoring in Obsidian

**Settings → Files and Links**: "Use [[Wikilinks]]" **off**, "New link format"
**Relative path to file**. Keeps links working in Obsidian, on GitHub, and once built.

## Quickstart

```bash
scripts/build.sh                        # builds example/txt -> public/
scripts/build.sh --source ../my-repo     # your own PublicTxt repo
scripts/build.sh --serve                 # local preview
```

```powershell
.\scripts\build.ps1 -Source ..\my-repo
.\scripts\build.ps1 -Serve
```

Pipeline, dev-server notes: [docs/wiki/build.md](docs/wiki/build.md).

## Publishing (GitHub Pages)

Keep the content repo pure Markdown; a workflow *in that repo* fetches this generator
at build time. Copy [`deploy/publish-to-github-pages.yml`](deploy/publish-to-github-pages.yml)
to `.github/workflows/publish.yml` there, set `HUGO_BASEURL`, and switch that repo's
**Settings → Pages → Source** to *GitHub Actions*.

Details: [docs/wiki/deploy.md](docs/wiki/deploy.md).
