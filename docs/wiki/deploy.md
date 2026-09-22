---
covers:
  - deploy/publish-to-github-pages.yml
---

# Deploy

`deploy/publish-to-github-pages.yml` is a **template for the content repo**, not a
workflow that runs here. The content repo stays pure Markdown; this repo is
checked out beside it at build time, so upgrading the site is a one-line `ref`
change.

## Setting it up

1. Copy the file into the content repo as `.github/workflows/publish.yml`.
2. In that repo: **Settings → Pages → Source: GitHub Actions**. A custom domain
   stays configured there; the `CNAME` file is no longer needed (and the sync step
   skips it anyway).
3. Edit the `env:` block on the Build step.

## Shape

Triggers on push to `main` and `workflow_dispatch`. Permissions
`contents: read`, `pages: write`, `id-token: write`; concurrency group `pages`
with `cancel-in-progress`.

| Step | Detail |
|---|---|
| Check out content | into `txt/`, **`fetch-depth: 0`** |
| Check out PublicTxt-Hugo | `repository: publictxt/txt-hugo`, `ref: main`, into `site/` |
| Set up Hugo | `peaceiris/actions-hugo@v3`, pinned version |
| Set up Node | for `npx pagefind` |
| Build | `sh site/scripts/build.sh --source ../txt` |
| Upload | `actions/upload-pages-artifact@v3`, `path: site/public` |
| Deploy | `actions/deploy-pages@v4` in the `github-pages` environment |

## The two things that matter

**`fetch-depth: 0` is load-bearing.** A page's `created`/`updated` come from the
first and last commit that touched it. The `actions/checkout` default is a shallow
clone with one commit, which makes every page report the same date at both ends.
The sync step warns when it sees one — check the build log if dates look wrong.
See [features/dates.md](features/dates.md).

**Per-site config is environment variables, not a fork.** Hugo's `HUGO_`-prefixed
[environment overrides](https://gohugo.io/configuration/introduction/#configure-with-environment-variables)
mean no content repo needs its own `hugo.toml`:

```yaml
env:
  HUGO_BASEURL: https://publictxt.net/
  HUGO_TITLE: "A PublicTxt instance"
  HUGO_PARAMS_DESCRIPTION: "A PublicTxt repository — browsable, searchable, plain-text first."
```

`build.sh` passes `HUGO_BASEURL` through as `-b`; the rest Hugo reads directly.

## Pinning

`ref: main` tracks this repo's tip — fine while it moves fast, but pin to a tag
for reproducible builds. `hugo-version` is already pinned (`0.166.0`).
