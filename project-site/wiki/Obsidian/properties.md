# Properties

Obsidian's Properties are the YAML front matter at the top of a note, and the site reads
the same lines. All are optional. Add one with **Add file property** (`Ctrl/Cmd+;`), or
type `---` on a note's first line.

Obsidian gives each property name one **type** across the vault. Set it once — click
the icon beside the property's name, then **Property type** — and every note follows.

## What the site reads

| Property | Type | On the site |
|---|---|---|
| `title` | Text | The page title. Else the first `# Heading`, else the file name |
| `tags` | Tags | Tags, merged with inline `#hashtags` |
| `created` | Date, or Date & time | When it was written. Else from the file name, or Git |
| `updated` | Date, or Date & time | When it last changed. Else from Git |
| `description` | Text | For search engines and link previews |
| `collections` | List | [Collections](../writing.md#collections) it joins, as well as its folder's |
| `category` / `categories` | Text / List | From the [configured list](../configuration.md#categories) |
| `rating` | Number | Stars, 1–5; a sort and a filter |
| `bookmark` / `bookmarks` | Text / List | The URL(s) that make it a [bookmark](../writing.md#bookmarks) |
| `publish` | Checkbox | Unticked, the page stays off the site |
| `mastodon`, `substack`, … | Text / List | ["Posted on"](../writing.md#posted-elsewhere) links |
| `order`, `perPage` | Text, Number | On a folder's `_index.md`: its list's starting sort and page size |

Anything else — `aliases`, `cssclasses`, your own fields — is kept and ignored. Aliases
don't become alternative links on the site.

## Dates

**Date** writes `2026-10-02`; **Date & time** writes `2026-10-02T09:30`. Both work.

You rarely need either: leave them out and the date comes from the file name or Git
history ([Dates](../writing.md#dates)). Set `created` when the date is part of what the
note is, or when it isn't when it was committed — an old post brought in from elsewhere.

Set `updated` only if you mean it to stay: once written, it's the page's *updated*
date however often you edit afterwards.

## Publish

A **Checkbox**: unticked writes `publish: false`, and the page stays off the site.
Ticked, or no `publish` property at all, it's published.

That makes a draft workflow: give your post template an unticked `publish`, and tick it
when the post is ready. Hidden is not private — the note is still in the repo
([Drafts](../writing.md#drafts-and-hidden-pages)).

`published` — another name, which Hugo reads as Jekyll does — works the same way:
`false` keeps the page off. A date in it (Web Clipper writes the article's) or a blank
is ignored.

## Tags

The **Tags** type writes a list, without the `#`:

```yaml
tags:
  - hugo
  - search
```

Inline `#hashtags` in the text work too; the site merges both. Obsidian's nested tags,
`books/fiction`, aren't supported — use `books-fiction`, or two tags.
