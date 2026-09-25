---
covers:
  - deploy/publish-to-github-pages.yml
---

# Deploy

`publish-to-github-pages.yml` is a **template for the content repo**, not a workflow
here; setup steps are in its header. The content repo stays pure Markdown and checks
this repo out at build time, so upgrading the site is its `ref:` — `main` tracks the
tip; pin a tag for reproducible builds.

**`fetch-depth: 0` is load-bearing** — page dates come from Git history
([traps.md](traps.md)).

**Per-site config is `HUGO_`-prefixed env vars** on the Build step, which Hugo reads
as [config overrides](https://gohugo.io/configuration/introduction/#configure-with-environment-variables):
`HUGO_TITLE`, `HUGO_PARAMS_DESCRIPTION`, `HUGO_PARAMS_MASTODON`, … `build.sh` passes
`HUGO_BASEURL` as `-b`. `HUGO_PARAMS_EDITURL` is prefilled from the GitHub context, so
edit links work for any repo; `""` hides them.
