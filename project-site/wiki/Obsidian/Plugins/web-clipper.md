# Web Clipper

[Obsidian Web Clipper](https://obsidian.md/clipper) is Obsidian's official browser
extension — not a plugin. It saves the page you're reading into your vault as a note,
with properties from a template. Set the template up once, and every clip is a
[bookmark](../../writing.md#bookmarks).

## Its properties, on the site

The default template writes these properties; the site treats them as:

| Property | On the site |
|---|---|
| `title` | The page title |
| `source` | Nothing — **rename it `bookmark`** (below) |
| `author`, `published` | Kept, not shown |
| `created` | The clip date: the page's created date |
| `description` | The page's description, for search engines and previews |
| `tags` | Tags — `clippings` by default |

## A bookmark template

In the extension's settings, edit the default template (or add one):

| Field | Set to | Why |
|---|---|---|
| Note location | A folder under `bookmarks/`, e.g. `bookmarks/clippings` | Its own section, with the bookmark chips |
| Properties | Rename `source` to `bookmark` | A `bookmark:` URL makes the page a bookmark, with its link as a chip |
| Note content | Your notes, not the page's text | See below |

The bookmark convention files one per site, `bookmarks/sites/<domain>/` — but a page is
a bookmark by its `bookmark:` URL, wherever it lives, so a single folder works just as
well.

## Don't republish the article

The default template saves the whole article as the note's content. On your site, that
republishes someone else's writing. For a bookmark, keep the link, the description and
your own thoughts: replace `{{content}}` in the template's note content with
`{{selection}}` — just what you highlighted, to quote — or leave it empty.

If you want full text for your own reading, clip into a folder that
[stays off the site](../../configuration.md#leave-folders-out) — though it's still in
your public repo — or into another vault.
