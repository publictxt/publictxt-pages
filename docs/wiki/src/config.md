---
covers:
  - hugo.toml
---

# hugo.toml

Every setting is either load-bearing or a knob a publishing repo overrides.

## Content mounts

Hugo's content is the **union of two directories**:

```toml
[[module.mounts]] source = "build/content"   target = "content"   # sync output
[[module.mounts]] source = "site-content"    target = "content"   # site's own pages
```

`build/content` is generated and wiped every build — never edit it. `site-content` holds
pages belonging to the site rather than anyone's notes (the search page).

## Front matter mapping

```toml
[frontmatter]
date        = ["created"]
lastmod     = ["updated", "created"]
publishDate = ["created"]
```

Sync writes `created:`/`updated:` on every page; this turns them into `.Date` and
`.Lastmod`, which every template and sort reads. Removing it silently reverts the site
to Hugo's own date guessing. See [features/dates.md](../features/dates.md).

## Params

| Param | Effect |
|---|---|
| `description` | fallback meta description and home lead |
| `shortTitle` | header title on narrow screens |
| `favicon` | relative URL or absolute path |
| `sectionOrder` | section navigation order; unlisted follow alphabetically ([D10](../decisions/D10.md)) |
| `tagCloudLimit` | terms in the sidebar cloud; currently 30 (template falls back to 20) |
| `recentLimit` | pages in the home Recent list; currently 8 |
| `listOrder` | default browse-list sort |
| `listPerPage` | default cards per page |

The last two are overridable per section via `order:` / `perPage:`, inherited by
sub-folders — see [browse lists](../features/browse-lists.md).

## Markup, outputs, taxonomies

`[markup.goldmark.renderHooks.link] useEmbedded = "fallback"` — the embedded link render
hook resolves relative `.md` destinations (Obsidian "relative path to file" links)
natively, which is why sync rewrites no links ([D5](../decisions/D5.md)). It also
resolves the site-relative `/tags/x/` destinations the hashtag linkifier emits, so
sub-path deployments work. `[markup.highlight]` uses `github-dark`; [main.css](css.md)
overrides the background it emits.

`[outputs] home / section / term = ["html"]` — naming the formats explicitly keeps
Hugo's default RSS off. Listing `"json"` is what the **old** per-page-index design did;
the site-wide index is now an asset built by `site-index.html`, not an output format
([D7](../decisions/D7.md)).

`[taxonomies] tag = "tags"` — one taxonomy. `categories` is **not** configured; it does
not exist on this site.

## Environment overrides

`HUGO_`-prefixed environment variables override any of this, which is how a content repo
customises the site without forking this file: `HUGO_BASEURL`, `HUGO_TITLE`,
`HUGO_PARAMS_DESCRIPTION`. See [deploy](../deploy.md).
