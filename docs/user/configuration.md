# Configuration

Everything is optional — the defaults give a working site. Change what you need.

- [Where settings live](#where-settings-live)
- [Site identity](#site-identity)
- [Sidebar and home](#sidebar-and-home)
- [Browse lists](#browse-lists)
- [Timeline and folder tree](#timeline-and-folder-tree)
- [Categories](#categories)
- [Filter chips](#filter-chips)
- [Post sources](#post-sources)
- [Leave folders out](#leave-folders-out)
- [A full example](#a-full-example)

## Where settings live

Three layers; later wins:

| Layer | Where | Use for |
|---|---|---|
| 1. Defaults | `hugo.toml` in publictxt-pages | Read it for every option and its default — don't edit it |
| 2. Your settings | `settings/site.toml` in your **content repo** | Most settings: lists, tables, anything you'd keep with your notes |
| 3. Workflow env vars | `HUGO_*` in `.github/workflows/publish.yml` | Per-deployment values: `HUGO_BASEURL`, `HUGO_TITLE`, edit URL |

Rules for `settings/site.toml`:

- **Tables merge key by key** — set one key under `[params]`, keep the other defaults.
- **Lists replace whole** — a `sectionOrder` or `[[params.chipFacets]]` you write is the
  entire list, not an addition.
- Keep to `title`, `baseURL` and `[params]`. Overriding mounts or `contentDir` breaks
  the build.
- Env vars map by name: `params.description` → `HUGO_PARAMS_DESCRIPTION`. Use env vars
  for plain values only; lists and tables go in `site.toml`.

`settings/` is published like any folder, except `site.toml`. Starter:
[`example/txt/settings/site.toml`](../../example/txt/settings/site.toml).

## Site identity

```toml
title = "My notes"

[params]
  description = "Plain-text notes, published."   # meta description, home
  shortTitle = "Notes"                            # header title on phones
  favicon = "media/icon.png"                      # a PNG in your content repo
  mastodon = "https://mastodon.social/@you"       # hidden rel="me", for profile verification
  # editURL: set by the workflow (HUGO_PARAMS_EDITURL); "" hides the edit link

  [params.footer]
    text = "© Me. Built with [publictxt-pages](https://github.com/publictxt/publictxt-pages)"
    edit = "Suggest an edit"    # label for the edit link; "" hides it
```

`footer.text` is inline Markdown. `""` hides a footer line.

## Sidebar and home

```toml
[params]
  sectionOrder = ["blog", "wiki", "notes"]   # top-level folders; unlisted ones follow A→Z
  tagCloudLimit = 30                         # tags in a list's Other tags (and its no-JS cloud)
  recentLimit = 8                            # cards per page in the home "Recent" list
```

Sections are fixed-order on purpose: ordering by date would reshuffle your navigation
on every edit.

## Browse lists

Site-wide defaults for every section and tag list:

```toml
[params]
  listOrder = "created"   # created | updated | title | rating, optionally + " asc"/" desc"
  listPerPage = 20
```

`created` and `updated` default newest first, `title` A→Z, `rating` top first.

**Per section**: in a folder's `_index.md` front matter. Applies to that folder and
every folder below it, unless one sets its own.

```yaml
---
order: title
perPage: 50
---
```

Readers can still change the sort; this is the starting order.

## Timeline and folder tree

The right column of a page shows its place in the site — a dated **timeline** for
logs, or a **folder tree** for reference material. See [The published site](site.md#on-a-page).

```toml
[params]
  # Collections sharing one timeline, with a chip per collection to narrow it.
  # Other pages get their own section's timeline. [] = every page its section's.
  timelineCollections = ["blog", "posts"]

  # Tags given a chip on that shared timeline (include/exclude) — e.g. journal
  # entries among blog posts. [] = none.
  timelineTags = ["journal"]

  # Sections whose pages show a folder tree instead of the timeline.
  treeSections = ["wiki"]
```

## Categories

A small, fixed vocabulary — unlike tags, which are free-form.

```toml
[params.categories]
  enabled = true
  list = ["Project", "Personal", "Tech"]
```

Pages pick with `category: Tech` or `categories: [Tech, Personal]` (case doesn't
matter). A value not on the list is ignored, with a build warning. `enabled = false`
removes categories from the whole site.

## Filter chips

The chips in browse lists and search. Writing any `[[params.chipFacets]]` replaces the
whole default — list every facet you want, in display order.

```toml
[[params.chipFacets]]
  key = "collection"            # collection | category | tag
  label = "Collection"
  states = ["include", "exclude"]
  match = ["any"]

[[params.chipFacets]]
  key = "tag"
  label = "Tags"
  # defaults: states = ["include", "exclude"], match = ["all", "any"]
```

| Field | Meaning |
|---|---|
| `key` | Which facet. Leave a key out to drop its chips |
| `states` | `["include"]` or `["exclude"]`: a click toggles it. Both: click includes, ✕ excludes |
| `match` | How several included chips combine: `"all"` (every one) or `"any"`. One value fixes it; two show a toggle, the first the default |

Changing a facet's default `match` changes what existing shared links mean (links omit
the default).

## Post sources

Front matter keys holding a URL where a page was also posted, shown as "Posted on"
links. Key → label:

```toml
[params.sources]
  mastodon = "Mastodon"
  substack = "Substack"
  bluesky = "Bluesky"
```

Writing this table merges with the defaults (`facebook`, `twitter`, `substack`,
`mastodon`, `github`). Usage: [Writing → Posted elsewhere](writing.md#posted-elsewhere).

## Leave folders out

Whole folders — notes and attachments — kept off the site. Paths from the repo root,
case-insensitive:

```toml
[params]
  excludeFolders = ["settings/Templates", "private-drafts"]
```

Typical use: Obsidian's Templates folder, whose `{{date}}` placeholders would otherwise
publish. Excluded is **hidden, not private** — it's still in your public repo. Links
into an excluded folder break.

## A full example

```toml
# settings/site.toml
title = "Jo's notes"

[params]
  description = "Notes, links and a dev log."
  shortTitle = "Jo"
  favicon = "media/icon.png"
  sectionOrder = ["blog", "wiki", "bookmarks", "notes"]
  timelineCollections = ["blog"]
  timelineTags = []
  treeSections = ["wiki"]
  excludeFolders = ["settings/Templates"]
  listPerPage = 30

  [params.footer]
    text = "Jo · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)"

  [params.categories]
    enabled = true
    list = ["Tech", "Books", "Personal"]

[[params.chipFacets]]
  key = "category"
  label = "Category"
  states = ["include"]
  match = ["any"]
[[params.chipFacets]]
  key = "tag"
  label = "Tags"
```

Check it locally with `python scripts/build.py --source ../my-notes --serve`
([Setup](setup.md#optional-preview-locally)) before pushing — a TOML typo fails the build.
