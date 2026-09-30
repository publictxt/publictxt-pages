---
categories: 
    - Tech
    - CompSci
title: "Dates"
created: 2025-01-01T12:00:00+00:00
created_source: git
updated: 2025-03-01T12:00:00+00:00
source_path: "wiki/Pipeline/Dates.md"
tags: ["pipeline", "dates"]
---
[Pipeline](_index.md) -> [Hashtags](Hashtags.md) -> Dates [#pipeline](/tags/pipeline/) [#dates](/tags/dates/)

Every page gets a `created` and an `updated`, each from the first source that has one:

| Source | `created` | `updated` |
|---|---|---|
| Front matter | `created:` (or `date:`) | `updated:` (or `lastmod:`) |
| Name or path | `YYYYMMDD`, `YYYY-MM-DD`, `YYYY/MM/DD/` | — |
| Git | first commit | last commit |

> Front matter wins; Git is the fallback.

A section index takes its newest page's `updated`. The rules live in [[dates.py]] — a wikilink, which renders as literal text.

Hugo's side: [front matter dates](https://gohugo.io/content-management/front-matter/#dates) — a link whose
URL fragment must not be mistaken for a tag, and a bare one:
https://gohugo.io/methods/page/date/#examples
