---
title: "A post with full front matter"
date: 2026-09-15T14:30:00+02:00
tags: ["announcement", "publictxt"]
author: "example"
source_repo: "example-txt"
---

# This H1 must NOT become the title

The front matter already has `title:`, `date:` (full ISO 8601 with time) and inline-style `tags:`. The sync step must leave all of that alone and keep this H1 in the body. #hugo

`author` and `source_repo` are carried but not shown in the UI (v1).
