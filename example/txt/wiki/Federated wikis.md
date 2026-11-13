---
rating: 3
fork_remote: Ann-Notes
fork_repo: https://github.com/example/notes
fork_path: wiki/Federated wikis.md
fork_branch: main
fork_commit: 85f3c01ab408f962ce6ba605e40c96f606e381f9
fork_blob: 45498a3189372726335d411ad5c374efc656870d
fork_date: 2026-11-12T21:17:41+02:00
source_name: "authored, so dropped"
---
# Federated wikis

A fork: this author's own page, made from one in a followed repo, with where it came
from in `fork_*` keys. It lives in this repo's own folders, so lists and search show
it; [Plain text tools](<../community/ann-notes/wiki/Plain text tools.md>), a mirror,
is the same repo's page as written there. Its **source** is the follow `fork_remote` names (case aside), shown as
"Forked from" with a link back to the original — the forked file, at the commit it
was forked from. Its source rating is the follow's `rating` (4), apart from the
page's own (3).

The source is computed at build time, never written to the repo: a `source_name:`
written here is dropped.
