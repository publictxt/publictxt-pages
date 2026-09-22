---
covers:
  - deploy/publish-to-github-pages.yml
---

# Deploy

`publish-to-github-pages.yml` is a
**template for the content repo**, not a workflow that runs here. The content repo
stays pure Markdown; this repo is checked out beside it at build time, so upgrading the
site is a one-line `ref` change.

## Setting it up

1. Copy the file into the content repo as `.github/workflows/publish.yml`.
2. There: **Settings → Pages → Source: GitHub Actions**. A custom domain stays
   configured there; the `CNAME` file is no longer needed (sync skips it anyway).
3. Edit the `env:` block on the Build step.

## Shape

Push to `main` or `workflow_dispatch`. Permissions `contents: read`, `pages: write`,
`id-token: write`; concurrency group `pages`, cancel-in-progress.

| Step | Detail |
|---|---|
| Check out content | into `txt/`, **`fetch-depth: 0`** |
| Check out PublicTxt-Hugo | `publictxt/txt-hugo`, `ref: main`, into `site/` |
| Set up Hugo | `peaceiris/actions-hugo@v3`, pinned `0.166.0` |
| Set up Node | for `npx pagefind` |
| Build | `sh site/scripts/build.sh --source ../txt` |
| Upload / Deploy | `upload-pages-artifact@v3` (`site/public`), then `deploy-pages@v4` |

## The two things that matter

**`fetch-depth: 0` is load-bearing.** A page's dates come from the first and last
commit that touched it; the `actions/checkout` default is a one-commit shallow clone,
which makes every page report the same date at both ends. Sync warns — check the build
log if dates look wrong. See [features/dates.md](features/dates.md).

**Per-site config is environment variables, not a fork.** Hugo's `HUGO_`-prefixed
[environment
overrides](https://gohugo.io/configuration/introduction/#configure-with-environment-variables)
mean no content repo needs its own `hugo.toml`:

```yaml
env:
  HUGO_BASEURL: https://publictxt.net/
  HUGO_TITLE: "A PublicTxt instance"
  HUGO_PARAMS_DESCRIPTION: "A PublicTxt repository — browsable, searchable, plain-text first."
  HUGO_PARAMS_MASTODON: "https://hachyderm.io/@jaysen"
```

`build.sh` passes `HUGO_BASEURL` through as `-b`; the rest Hugo reads directly.

**Pinning:** `ref: main` tracks this repo's tip — pin to a tag for reproducible builds.
