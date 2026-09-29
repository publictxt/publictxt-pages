---
title: "A post with full front matter"
created: 2026-09-15T14:30:00+02:00
updated: 2026-09-16T09:00:00+02:00
tags: ["announcement", "publictxt", "hugo"]
author: "example"
source_repo: "example-txt"
category: Personal
rating: 4
collections: [posts, announcements]
mastodon: https://mastodon.social/@example/113000000000000000
substack:
  - https://example.substack.com/p/full-front-matter
  - https://example.substack.com/p/full-front-matter-part-2
created_source: front-matter
source_path: "blog/20260915-a-post-with-full-front-matter.md"
---

# This H1 must NOT become the title

The front matter already has `title:`, `created:` and `updated:` (full ISO 8601 with time) and inline-style `tags:`. The sync step must leave all of that alone and keep this H1 in the body. [#hugo](/tags/hugo/)

`collections:` lists it under Posts too; `announcements` has no folder, so it is only a chip and a filter value.

`mastodon:` and `substack:` are post sources (`params.sources`): shown as "Posted on" links.

`author` and `source_repo` are carried but not shown in the UI (v1).
