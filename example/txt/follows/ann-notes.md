---
url: git@github.com:example/notes.git
rating: 4
description: Ann's wiki on federation and plain-text tools.
folder: remotes/ann-notes
---
# Ann's notes

A follow: a page about a repo this one follows — why, and what to read there. Its
`url` makes it one (written here the SSH way; the site reads it as
`https://github.com/example/notes`), its file name is the follow's name, and its
`rating` is this author's rating of that repo: the **source rating** of every page
forked through it, such as [Federated wikis](<../remotes/ann-notes/wiki/Federated wikis.md>).

Its `description` is the tooltip on a fork card's source chip, with the repo and the
rating; the rating is shown here as the source's, and the page itself is unrated.

Other keys (`folder`) belong to the tool that fetched the repo; the site ignores them.
