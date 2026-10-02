# Templates

Obsidian's core **Templates** plugin inserts a prepared note — properties and all — into
the one you're writing. Use it to start posts, bookmarks and wiki pages with the right
properties already there.

## Set up

1. **Settings → Core plugins → Templates**: on.
2. **Settings → Templates → Template folder location**: `settings/Templates`.
3. Keep that folder off the site, in `settings/site.toml`:

   ```toml
   [params]
     excludeFolders = ["settings/Templates"]
   ```

   Without this, each template is published as a page, placeholders and all —
   [Leave folders out](../../configuration.md#leave-folders-out).

Insert one with the command **Templates: Insert template**, or the ribbon icon.

## Placeholders

| Placeholder | Becomes |
|---|---|
| `{{title}}` | The note's name |
| `{{date}}`, `{{time}}` | Now, in the formats under **Settings → Templates** |
| `{{date:YYYY-MM-DD}}` | Now, in the format given |

**For dates in properties, give the format** — `{{date:YYYY-MM-DD}}`, not `{{date}}`.
Plain `{{date}}` follows the *Date format* setting, and a format meant for reading, like
`DD/MM/YYYY`, writes a `created` the build can't read, failing the publish.

## Templates for the site

A blog post, held back until you tick `publish`:

```markdown
---
created: {{date:YYYY-MM-DD}}
tags:
publish: false
---
```

A bookmark:

```markdown
---
bookmark:
tags:
---
Why it's worth keeping:
```

A wiki page needs no template: the site dates it from Git, and titles it from its first
heading or file name.

## Templater

[Templater](https://github.com/SilentVoid13/Templater), a community plugin, does the
same with more — templates applied to every new note in a folder, file renaming,
scripting. Its date is `<% tp.date.now("YYYY-MM-DD") %>`. The same advice holds: keep
its templates in an excluded folder.
