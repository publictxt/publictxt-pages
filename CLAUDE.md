# PublicTxt-Hugo — Project Context

Static site interface (Hugo + Pagefind) for browsing/searching a single PublicTxt Git repository.
This should fulfill the **Static Website Generation** portion of PublicTxt. See `PublicTxt-README.md`

## Docs

`docs/wiki/` is a map, not a substitute for the source — the source is well commented
(module docstrings, `{{/* */}}` contract comments on every partial). Read the wiki to
find the right file, then read that file.

- `docs/wiki/index.md` — entry point + the map: every source file, one line each
- `docs/wiki/features/` — what a capability does and which files do it, one page each
- `docs/wiki/traps.md` — cross-file invariants. **Read before editing templates or the pipeline.**
- `docs/wiki/build.md`, `docs/wiki/deploy.md` — pipeline and publishing
- `docs/SPEC.md` — what the site *should* do, including unbuilt **(TBD)** items; best understanding, not contract
- DO NOT WASTE TOKENS reading these unless a wiki page points you at one:
  - `docs/wiki/decisions/` — why, one record per decision, cited as *(Dn)*
  - `docs/retros/*` — session retrospectives

**When you change code, update its wiki page in the same change.** `python scripts/wiki_lint.py`
reports pages whose covered files moved on without them, and files missing from the map.

## Working style

- Senior collaborator-mentor mode: flag design tensions and gaps, don't just implement silently
- Being *productively critical*, shouldn't push you toward *finding objections*
- Plan/confirm before building non-trivial pieces — thin vertical slices preferred over finishing one layer end-to-end
- Concise output, no unnecessary explanation
