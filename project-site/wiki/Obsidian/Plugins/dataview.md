# Dataview

[Dataview](https://blacksmithgu.github.io/obsidian-dataview/), a community plugin,
queries your vault like a database. The site renders one kind of query; the rest stay in
Obsidian.

## What the site renders

A list of the pages with a tag:

````markdown
```dataview
LIST FROM #recipes
LIMIT 10
```
````

- Recently updated first, as compact cards.
- `LIMIT` is optional; past it, a link to the tag's page.
- Keywords in any case, one per line.

The same block shows the same list in Obsidian. Here, live — this site's pages tagged
`obsidian`:

```dataview
LIST FROM #obsidian
```

## What stays a code block

Anything else — `TABLE`, `TASK`, `WHERE`, `SORT`, `FROM "folder"`, several tags,
DataviewJS, inline queries — appears on the site as a code block showing the query, and
the build warns. It still works in Obsidian.

If readers shouldn't see a query, keep it in a note with `publish: off` — a dashboard
for you, not the site.

## Fields: use properties

Dataview reads [properties](../properties.md), and so does the site: `created`,
`rating`, `tags` and the rest mean the same in your queries and on the site.

Inline fields — `rating:: 4` in the text — are Dataview's alone. The site shows them as
written and doesn't read them.

## Dates differ

Dataview's `file.ctime` and `file.mtime` are your disk's dates: after a fresh clone,
every file's is the day you cloned. The site's dates come from file names and Git
history. To sort the same way in both, query a `created` property.
