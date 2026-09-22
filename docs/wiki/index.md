# Source Wiki

How this repo works, written to be read **instead of** the source. The two or three
relevant pages cost a fraction of reading [scripts/](../../scripts/),
[layouts/](../../layouts/) and [assets/](../../assets/).

> If a page contradicts the code, the code wins — and the page is a bug. Fix it in the same change.

| Area | Holds |
|---|---|
| [features/](features/index.md) | One page per capability. **Behaviour**: what the reader sees, and the path through the code. |
| [src/](src/index.md) | One page per subsystem. **Contracts**: what a file does, what it exports, who calls it, what bites. |
| [build.md](build.md) | Pipeline, ordering constraint, local commands. |
| [deploy.md](deploy.md) | The GitHub Actions workflow. |
| [decisions/](decisions/DECISIONS.md) | **Reasoning**, one record per decision, cited as *(Dn)*. |

[docs/SPEC.md](../SPEC.md) sits above all of it: what the site *should* do, including
unbuilt **(TBD)** items. The wiki describes only what exists.

*"How does sorting a tag page work?"* → features. *"What does `list-order.html` return?"* → src.
Feature pages own behaviour, src pages own contracts; neither repeats the other.

## Keeping it honest

A stale code wiki is worse than none — it answers confidently and wrongly.

1. Every page's `covers:` front matter names real paths.
2. [scripts/wiki_lint.py](../../scripts/wiki_lint.py) checks the claim.

**Change code and its wiki page in the same commit.** The lint is the safety net, not the process.

```console
$ python scripts/wiki_lint.py
STALE   docs/wiki/src/js.md
          assets/js/list.js changed 2026-09-22, page last updated 2026-09-19
ORPHAN  assets/js/new-thing.js - no wiki page covers this file
31 page(s) checked | 1 stale | 0 missing | 0 bare | 1 orphan
```

Exits non-zero, so it drops into CI or a pre-commit hook unchanged. A **file** in
`covers:` means "describes what is in that file" — stale on any edit. A **directory**
means "describes the set of files here" — stale only when files are added or removed,
which is what index pages want.

Keep pages short: one needing three-deep headings is two pages.
