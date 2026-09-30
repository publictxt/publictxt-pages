# publictxt-pages — Project Context

Static site interface (Hugo + Pagefind) for browsing/searching a single PublicTxt Git repository.
This should fulfill the **Static Website Generation** portion of PublicTxt. See `PublicTxt-README.md`

## Docs

`docs/wiki/` is a map, not a substitute for the source — the source is well commented
(module docstrings, `{{/* */}}` contract comments on every partial). Read the wiki to
find the right file/s, then read those files.

- `docs/wiki/index.md` — entry point + the map: every source file, one line each
- `docs/wiki/traps.md` — cross-file invariants. **Read before editing templates or the pipeline.**
- `docs/SPEC.md` — what the site *should* do, including unbuilt **(TBD)** items; best understanding, not contract

**Keep docs in step, in the same change:** the map when a file is added, moved or removed
(`python scripts/map_lint.py` checks, and CI runs it); `traps.md` when a cross-file invariant
appears or goes — and a trap fixed in code or covered by a test comes off the list.

## Tests

Run `python -m unittest` after changing `scripts/`, `example/` or templates, and
`node --test "tests/js/*.test.mjs"` after changing `assets/js/`. A golden failure from an
intended change: refresh (`GOLDEN_UPDATE=1 python -m unittest tests.test_golden tests.test_site` — together, in that order), then read
`git diff tests/golden` and tell the user what moved — never refresh to silence a surprise.

## Working style

- Concise output
- Senior collaborator-mentor mode: flag design tensions and gaps, don't just implement silently
- Being *productively critical*, shouldn't push you toward *finding objections*
- Plan/confirm before building non-trivial pieces — thin vertical slices preferred over finishing one layer end-to-end
