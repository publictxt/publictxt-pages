---
description: Writing for the site in Obsidian — settings, properties, plugins
order: title
---
# Obsidian

Obsidian is the recommended editor: a vault is a folder of Markdown files, so your
content repo *is* a vault, and Obsidian's link and property formats are what the site
reads. Nothing here needs a plugin — but a few make writing and publishing smoother.

## Settings that matter

Set once per vault; the reasons are in [Setup, step 3](../setup.md#3-configure-obsidian).

- **Use `[[Wikilinks]]`** — off
- **New link format** — Relative path to file
- **Default location for new attachments** — Same folder as current file
- **Automatically update internal links** — on
- **Strict line breaks** — on

## Properties

Obsidian's Properties are the front matter the site reads — title, dates, tags,
collections, rating, bookmark, publish. Which type to give each, and what it does:
[Properties](properties.md).

## Plugins

| Plugin | Kind | Use |
|---|---|---|
| [Obsidian Git](Plugins/obsidian-git.md) | Community | Commit and push — that is, publish — from Obsidian |
| [Templates](Plugins/templates.md) | Core | Start notes with the right properties |
| [Daily notes](Plugins/daily-notes.md) | Core | A note a day, named by its date: a journal or log |
| [Unique note creator](Plugins/unique-note-creator.md) | Core | Quick notes named by date and time |
| [Dataview](Plugins/dataview.md) | Community | Lists of notes by tag — on the site too |
| [Link Converter](Plugins/link-converter.md) | Community | Turn existing wikilinks into Markdown links |
| [Web Clipper](Plugins/web-clipper.md) | Browser extension | Save web pages as bookmarks |

Core plugins ship with Obsidian: **Settings → Core plugins**. Community plugins install
from **Settings → Community plugins → Browse**. Their settings live in `.obsidian/`,
which the site never publishes.

## What doesn't carry over

Some Obsidian syntax has no meaning on the site, and shows as written:

| In Obsidian | On the site |
|---|---|
| `%%comment%%` — hidden in Obsidian | **Shown, as text.** Don't keep private asides in comments |
| `[[wikilinks]]`, `![[embeds]]` | Text — use `[text](note.md)` and `![](note.md)` |
| Callouts, `> [!note]` | A plain quote, `[!note]` included |
| `==highlights==` | Text, with the `==` |
| Math, `$…$` | Text, with the `$` |
| Mermaid diagrams | A code block |
| Block IDs, `^abc123` | Text |
| Nested tags, `#books/fiction` | The tag ends at the `/`: `books` |
| Dataview, beyond `LIST FROM #tag` | A code block — see [Dataview](Plugins/dataview.md) |
| Inline fields, `key:: value` | Text — use a property |

Footnotes, task lists, tables, and links to headings (`note.md#heading`) all work.
