---
covers:
  - hugo.toml
---

# hugo.toml

The whole site configuration. Every setting here is either load-bearing for the
build or a knob a publishing repo overrides.

## Content mounts

Hugo's content is the **union of two directories**:

```toml
[[module.mounts]] source = "build/content"   target = "content"   # sync output
[[module.mounts]] source = "site-content"    target = "content"   # site's own pages
```

`build/content` is generated and wiped every build — never edit it. `site-content`
holds pages that belong to the site rather than anyone's notes (currently just the
search page).

## Front matter mapping

```toml
[frontmatter]
date        = ["created"]
lastmod     = ["updated", "created"]
publishDate = ["created"]
```

The sync step writes `created:`/`updated:` on every page; this is what turns them
into `.Date` and `.Lastmod`, which every template and sort reads. Removing this
mapping silently reverts the whole site to Hugo's own date guessing.

## Params

| Param | Effect |
|---|---|
| `description` | fallback meta description and home lead |
| `shortTitle` | header title on narrow screens |
| `favicon` | relative URL or absolute path |
| `sectionOrder` | section navigation order; unlisted follow alphabetically ([D10](../decisions/D10.md)) |
| `tagCloudLimit` | terms in the sidebar cloud; currently 30 (template falls back to 20 if unset) |
| `recentLimit` | pages in the home Recent list; currently 8 (template fallback 8) |
| `listOrder` | default browse-list sort, `"<field> [asc\|desc]"` |
| `listPerPage` | default cards per page |

`listOrder` / `listPerPage` are overridable per section via `order:` / `perPage:`
front matter, inherited by sub-folders — see
[browse lists](../features/browse-lists.md).

## Markup

```toml
[markup.goldmark.renderHooks.link] useEmbedded = "fallback"
```

The embedded link render hook resolves relative `.md` destinations (Obsidian
"relative path to file" links) to page URLs natively — this is why no link
rewriting is needed at sync time ([D5](../decisions/D5.md)). It also resolves the
site-relative `/tags/x/` destinations the hashtag linkifier emits, so sub-path
deployments get the right prefix.

`[markup.highlight]` uses `github-dark`; `main.css` overrides the background it
emits.

## Outputs

```toml
[outputs] home = ["html"]  section = ["html"]  term = ["html"]
```

Naming the formats explicitly keeps Hugo's default RSS off. Listing `"json"` here
is what the **old** per-page-index design did; the site-wide index is now an asset
built by `site-index.html`, not an output format ([D7](../decisions/D7.md)).

## Taxonomies

`tag = "tags"` — one taxonomy. `categories` is **not** configured; it does not
exist on this site.

## Environment overrides

Hugo's `HUGO_`-prefixed environment variables override any of this, which is how a
publishing content repo customises the site without forking this file:
`HUGO_BASEURL`, `HUGO_TITLE`, `HUGO_PARAMS_DESCRIPTION`. See [deploy](../deploy.md).
