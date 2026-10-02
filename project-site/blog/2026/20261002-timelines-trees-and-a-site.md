# Timelines, folder trees — and a site of its own

The right-hand column of a page now shows where it sits.

**Timelines** for logs: a blog post shows its section by date — years, then months, then
titles — with the post marked. Blog and Posts share one, with a chip for each to narrow
it; this entry's is beside it. Section pages for logs show the same timeline above
their list, rendered without JavaScript. #timeline

**Folder trees** for reference: a wiki page shows its section's folders and pages,
open along its own path. Reference material is read by place, not by date —
[the guide's pages](../../wiki/setup.md) show one.

Also:

- **Leave folders out** — `excludeFolders` keeps whole folders off the site, such as
  Obsidian's Templates.
- **Search results group** by month or by stars, as browse lists do.
- **A user guide**: setup with Obsidian, configuration, writing, and what readers get.

And the guide is now this site. publictxt-pages builds its own project site from a
folder of its repo, with the same pipeline as any other — so the site is also a
working example. Its source is
[`project-site/`](https://github.com/publictxt/publictxt-pages/tree/main/project-site).
