# Unique note creator

Obsidian's core **Unique note creator** (once called *Zettelkasten prefixer*) makes a
new note named with the current date and time — for quick capture, short posts, or
Zettelkasten-style IDs.

## The date catch

Its default format, `YYYYMMDDHHmm`, names a note `202610021430.md`. The site reads a date
from eight digits standing on their own; twelve run together aren't one, so these notes
get their commit date instead. Put a separator after the day:

| Unique prefix format | File | Date on the site |
|---|---|---|
| `YYYYMMDDHHmm` (default) | `202610021430.md` | None — the commit date |
| `YYYYMMDD-HHmm` | `20261002-1430.md` | 2 Oct 2026 |
| `YYYY-MM-DD HHmm` | `2026-10-02 1430.md` | 2 Oct 2026 |

## Set up

**Settings → Core plugins → Unique note creator**: on. Then, under its settings:

- **Unique prefix format** — `YYYYMMDD-HHmm`, as above
- **New file location** — e.g. `posts`, for short posts that share the blog's timeline
- **Template file location** — optional; a template from `settings/Templates`

Create a note with the command **Unique note creator: Create new unique note**.

## Titles

The title is the file name — the timestamp — unless the note starts with a `# Heading`
or has a `title` property. For a short post, a heading reads better in lists and search.
