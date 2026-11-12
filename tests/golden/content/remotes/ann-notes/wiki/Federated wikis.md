---
rating: 3
fork_remote: Ann-Notes
fork_repo: https://github.com/example/notes
fork_path: wiki/Federated wikis.md
fork_branch: main
fork_commit: 85f3c01ab408f962ce6ba605e40c96f606e381f9
fork_blob: 45498a3189372726335d411ad5c374efc656870d
fork_date: 2026-11-12T21:17:41+02:00
title: "Federated wikis"
created: 2025-01-01T12:00:00+00:00
created_source: git
updated: 2025-03-01T12:00:00+00:00
source_path: "remotes/ann-notes/wiki/Federated wikis.md"
source_name: "ann-notes"
source_rating: 4
source_follow: "follows/ann-notes.md"
source_original: "https://github.com/example/notes/blob/85f3c01ab408f962ce6ba605e40c96f606e381f9/wiki/Federated%20wikis.md"
---
A fork: a page copied from a followed repo, with where it came from in `fork_*`
keys. Its **source** is the follow `fork_remote` names (case aside), shown as
"Forked from" with a link back to the original — the forked file, at the commit it
was forked from. Its source rating is the follow's `rating` (4), apart from the
page's own (3).

The source is computed at build time, never written to the repo: a `source_name:`
written here is dropped.
