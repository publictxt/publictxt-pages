---
categories: 
    - Tech
    - Project 
title: "Why Git . 20240816"
created: 2024-08-16
created_source: path
updated: 2025-03-01T12:00:00+00:00
source_path: "notes/Design notes/Why Git . 20240816.md"
tags: ["design", "git"]
---
Why a Git repository and not a database: plain files anyone can read, history for free, free hosting, and forks as the way to reuse and aggregate.

Filename has spaces and a dot; folder has a space. No H1. [#design](/tags/design/) [#git](/tags/git/)

Trade-offs:

1. Dates come from commits, so a shallow clone gets them wrong.
2. No live editing — a push rebuilds the site.
3. Big media bloats the repo; keep attachments small.
