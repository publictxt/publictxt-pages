# Daily notes

Obsidian's core **Daily notes** plugin opens one note per day, named by its date — a
journal, a work log, a diary of a project. The site reads the date from the name.

## Set up

**Settings → Core plugins → Daily notes**: on. Then, under **Settings → Daily notes**:

| Setting | Suggested | Why |
|---|---|---|
| Date format | `YYYY-MM-DD` | The file name is the date, and the site reads it as `created` |
| New file location | `blog` | A top-level folder is a section; under `blog`, entries share its timeline |
| Template file location | `settings/Templates/Daily` | Properties and a heading for each entry — below |

## Date formats the site reads

The name must hold the year, month and day as `YYYY-MM-DD` or `YYYYMMDD`; anything
around them is fine. Other formats are fine for reading but give no date, so those
entries fall back to their commit date.

| Date format | File | Date on the site |
|---|---|---|
| `YYYY-MM-DD` (default) | `2026-10-02.md` | 2 Oct 2026 |
| `YYYY-MM-DD dddd` | `2026-10-02 Friday.md` | 2 Oct 2026 |
| `YYYY/YYYY-MM-DD` | `2026/2026-10-02.md` — a folder per year | 2 Oct 2026 |
| `DD-MM-YYYY` | `02-10-2026.md` | None — the commit date |
| `MMMM D, YYYY` | `October 2, 2026.md` | None — the commit date |

A `/` in the format makes folders, as in the third row: a folder per year keeps a long
journal tidy.

## A template

`settings/Templates/Daily.md`:

```markdown
---
tags:
  - journal
---
# {{date:dddd D MMMM YYYY}}
```

- **The heading** becomes the title — "Friday 2 October 2026" rather than `2026-10-02`.
- **The `journal` tag** marks entries among your posts. The site's default
  `timelineTags = ["journal"]` gives them a chip on the blog's timeline, to show or
  hide them — [Timeline and folder tree](../../configuration.md#timeline-and-folder-tree).

Remember the templates folder is [kept off the site](templates.md#set-up).

## Publishing

Daily notes publish with your next push, like any note. For a private diary, keep it in
another vault — `publish: off` hides a page from the site, not from the repo.
