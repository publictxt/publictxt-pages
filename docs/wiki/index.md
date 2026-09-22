# Source Wiki

A maintained description of **how this repo works**, written so an LLM (or a new
contributor) can answer implementation questions without reading the source.
Reading the two or three pages relevant to a task costs a fraction of reading
`scripts/`, `layouts/` and `assets/` — and unlike a one-off summary, it is kept
current and can be checked.

> **Read this before opening source files.** If a page contradicts the code, the
> code wins — and the page is a bug: fix it in the same change.

## Layout

| Area | What it holds |
|---|---|
| [features/](features/index.md) | One page per user-visible capability. The **behaviour narrative**: what the reader sees, and the path through the code that produces it. |
| [src/](src/index.md) | One page per subsystem. The **file contracts**: what each file does, what it exports, who calls it, what will bite you. |
| [build.md](build.md) | The build pipeline, its ordering constraint, local commands. |
| [deploy.md](deploy.md) | The GitHub Actions workflow and what a publishing repo must configure. |
| [decisions/](decisions/DECISIONS.md) | The **reasoning**, one record per decision. Cited as *(Dn)* throughout. |

`docs/SPEC.md` sits above all of this: it says *what the site should do*, including
things not built yet. The wiki only describes what exists.

### Which axis do I want?

- *"How does sorting a tag page work?"* → a **feature** page.
- *"What does `list-order.html` return, and who calls it?"* → a **src** page.

The split is deliberate: feature pages own behaviour, src pages own contracts.
Neither repeats the other; they cross-link. If you find yourself writing the same
paragraph in both, it belongs on the feature page and the src page should link to it.

## Keeping it honest

A stale code wiki is worse than none — it answers confidently and wrongly. Two
mechanisms guard against that:

1. **Every page declares what it covers.** The `covers:` front matter lists real
   paths. A page with no `covers:` is a page nobody can check.
2. **`python scripts/wiki_lint.py`** flags every page whose covered files have
   changed since the page itself last did, plus `covers:` paths that no longer
   exist and source files no page covers.

The rule: **change code and its wiki page in the same commit.** The lint is the
safety net, not the process.

```console
$ python scripts/wiki_lint.py
STALE   docs/wiki/src/js.md
          assets/js/list.js changed 2026-09-22, page last updated 2026-09-19
ORPHAN  assets/js/new-thing.js - no wiki page covers this file
31 page(s) checked | 1 stale | 0 missing | 0 bare | 1 orphan
```

It exits non-zero when anything is reported, so it drops into CI or a pre-commit
hook unchanged. A **file** in `covers:` means "this page describes what is in that
file" — stale on any edit. A **directory** means "this page describes the set of
files here" — stale only when files are added or removed, which is what index and
overview pages want.

## Conventions

- Front matter is `covers:` (required) and nothing else.
- Cite decisions as *(D7)* with a link: `[D7](decisions/D7.md)`.
- Link source files as repo-relative paths in backticks; the src pages are the
  place for per-file detail, not the feature pages.
- Keep pages short. A page that needs headings three deep is two pages.
