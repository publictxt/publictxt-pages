# FAQ

## Is it really free?

Yes. GitHub Pages hosts the site and GitHub Actions builds it, both free for public
repos. publictxt-pages itself is free software, under the
[GPL-3.0](https://github.com/publictxt/publictxt-pages/blob/main/LICENSE).

## Can my notes stay private?

The site is public, and free GitHub Pages needs a public repo (a private one needs a
paid plan). Treat everything you push as published — including pages hidden with
`publish: off` or `excludeFolders`, which stay readable in the repo. Keep private notes
out of it: a separate vault, or a `.gitignore`d folder.
See [Drafts and hidden pages](../writing.md#drafts-and-hidden-pages).

## Do I need Obsidian?

No. Any editor that writes Markdown works, and you can mix them — see
[Other editors](../other-editors.md). Obsidian is the default because its vault is
already a folder of Markdown files, and its link and property formats match what the
site reads.

## Do I need to install anything?

Not to publish: the GitHub Action does the building. To preview on your own machine
you need Python, Hugo and Pagefind — [Setup](../setup.md#optional-preview-locally).

## My notes use `[[wikilinks]]`

They aren't converted, and show as plain text on the site. Turn wikilinks off in
Obsidian so new links are Markdown links, then convert the old ones that matter —
[Setup, step 3](../setup.md#3-configure-obsidian).

## Can I use my own domain?

Yes: point it at GitHub Pages and set `HUGO_BASEURL` in the workflow —
[Custom domain](../setup.md#optional-custom-domain).

## Can I change how it looks?

The title, description, footer, favicon, section order, list defaults and filters are
all settings — [Configuration](../configuration.md). The layout and colours are the
publictxt-pages theme; to change those, fork publictxt-pages and point your workflow's
checkout at your fork.

## How do updates reach my site?

The workflow fetches the latest publictxt-pages on every build, so improvements arrive
with your next push — or **Actions → Publish site → Run workflow**. To hold a version,
pin `ref:` in the workflow to a tag or commit.

## Can I host somewhere other than GitHub Pages?

The build is one Python script that writes a static `public/` folder, so any static host
can serve it. A ready-made workflow exists only for GitHub Pages so far.

## Does search send anything to a server?

No. Search runs in the reader's browser against an index published with the site.
