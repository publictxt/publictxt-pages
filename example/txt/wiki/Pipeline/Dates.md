--- 
categories: 
    - Tech
    - CompSci
---
# Dates

[Pipeline](_index.md) -> [Hashtags](Hashtags.md) -> Dates #pipeline #dates

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
