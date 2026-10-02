# Collections, filter chips and settings of your own

The biggest day so far, mostly about finding things.

**Collections.** Every page belongs to its top-level folder's collection, and can join
others with `collections:` — a post filed in `posts/` can be listed under Blog too.
A page with a `bookmark:` URL joins Bookmarks wherever it lives.
[Collections, explained](../../wiki/writing.md#collections).

**Filter chips you can configure.** Collection, category and tag chips, in the order
you choose; a click includes, the ✕ excludes; several included can match *all* or
*any*. [Filter chips](../../wiki/configuration.md#filter-chips).

**`settings/site.toml` in your own repo.** Settings too rich for the workflow's
environment variables — chip lists, section order — now live with your notes.

**Posted elsewhere.** `mastodon:`, `substack:` and other keys holding a URL show as
"Posted on" links.

**From Obsidian:** `![](note.md)` on its own line embeds a note, and a Dataview block,
`LIST FROM #tag`, lists the pages with that tag — on the site and in Obsidian alike.

Underneath, the build became one Python script for every OS, gained a check that fails
if Pagefind dropped a page from the index, and got snapshot tests over an example vault.

#filters #obsidian #dataview
