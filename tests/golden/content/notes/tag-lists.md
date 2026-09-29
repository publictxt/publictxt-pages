---
title: "Tag lists"
created: 2025-01-01T12:00:00+00:00
created_source: git
updated: 2025-03-01T12:00:00+00:00
source_path: "notes/tag-lists.md"
---
A Dataview block lists the pages with a tag:

```dataview
LIST FROM #sci
LIMIT 2
```

A query outside the supported subset stays a code block:

```dataview
TABLE rating FROM #sci
```
