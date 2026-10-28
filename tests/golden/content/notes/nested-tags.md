---
tags: ["nesting", "nesting--front-matter", "nesting--inline"]
title: "Nested tags"
created: 2025-01-01T12:00:00+00:00
created_source: git
updated: 2025-03-01T12:00:00+00:00
source_path: "notes/nested-tags.md"
---
Obsidian nests tags with `/`: [#nesting/inline](/tags/nesting--inline/). A nested tag also tags the page
with its parents, so this page is under `#nesting` too, though it never says so.

```dataview
LIST FROM #nesting/front-matter
```
