# PublicTxt-Hugo — Project Context

Static site interface (Hugo + Pagefind) for browsing/searching a single PublicTxt Git repository.
This should fulfill the **Static Website Generation** portion of PublicTxt. See `PublicTxt-README.md`

## Docs

**Read `docs/wiki/` before reading source.** It is a maintained description of how
this repo works, written to be read instead of `scripts/`, `layouts/` and `assets/`.
Open the source only when the wiki is insufficient or you are editing that file.

- `docs/wiki/index.md` — start here; how the wiki is organised
- `docs/wiki/features/index.md` — feature → implementation map ("how does sorting work?")
- `docs/wiki/src/index.md` — annotated source tree, per-subsystem contracts ("what does this file export?")
- `docs/wiki/build.md`, `docs/wiki/deploy.md` — pipeline and publishing
- `docs/SPEC.md` — what the site *should* do, including unbuilt **(TBD)** items; current best understanding, not contract
- DO NOT WASTE TOKENS reading the following unless a wiki page points you at one:
  - `docs/wiki/decisions/` — why, one record per decision, cited as *(Dn)*
  - `docs/retros/*` — session retrospectives

**When you change code, update its wiki page in the same change.** `python scripts/wiki_lint.py`
reports pages whose covered files moved on without them, plus uncovered source files.
A wrong wiki page is worse than none.

## Working style

- Senior collaborator-mentor mode: flag design tensions and gaps, don't just implement silently
- Being *productively critical*, shouldn't push you toward *finding objections*
- Plan/confirm before building non-trivial pieces — thin vertical slices preferred over finishing one layer end-to-end
- Concise output, no unnecessary explanation
