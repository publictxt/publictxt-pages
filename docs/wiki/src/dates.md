---
covers:
  - scripts/dates.py
---

# scripts/dates.py

The single source of truth for when a page is from. Imported by
`sync_content.py`; kept separate for the same reason as `hashtags.py` — one
definition, so nothing downstream can disagree. Behaviour and rationale:
[features/dates.md](../features/dates.md), [D4](../decisions/D4.md).

## Public surface

```python
class DateResolver:
    def __init__(self, src: Path)                      # one git log pass; construct once per sync
    git_times: dict[str, tuple[str, str]]              # rel -> (created, updated)
    shallow_clone: bool
    built_at: str
    def created(self, path, rel) -> tuple[str, str]    # (iso, rung)
    def updated(self, path, rel) -> str

def date_from_path(rel: str) -> str | None
def git_commit_times(src: Path) -> tuple[dict, bool]
def build_time() -> str
def sort_key(iso: str) -> datetime                     # comparable; unparseable sorts last
```

`created()` and `updated()` are only called for files with no explicit front
matter value — the `front-matter` rung is applied by `sync_content.stamp_for`.

## `git_commit_times`

One `git log --format=%x00%cI --name-only --no-renames -- .` pass over `src`.

- Paths in the output are relative to the **repo root**, which may sit above
  `src`; `rev-parse --show-prefix` gives the prefix to strip, and files outside it
  are skipped. This is what makes a source repo nested in a larger one work.
- `git log` is newest-first, so the **first** sighting of a path is its `updated`
  and every later (older) sighting pushes `created` back.
- `NUL` (`\x00`) prefixes the commit header, because a filename could otherwise
  look like a date line.
- `core.quotepath=false` keeps non-ASCII filenames readable.
- Returns `({}, False)` when git is unavailable or `src` isn't a working tree —
  an unversioned source repo is supported, it just falls to the next rung.
- `--no-renames`: a renamed file is "created" by the rename. Following renames
  would be more truthful but much slower on large repos.

## Date-in-path matching

`NAME_DATE_RES` tries `YYYY-MM-DD` then `YYYYMMDD` **in the stem**, each guarded by
`(?<!\d)` / `(?!\d)` so longer digit runs (IDs, ISBNs) don't match. Then
`PATH_DATE_RE` tries `.../YYYY/MM/DD/` anywhere in the path — not blog-only.
`_valid()` constructs a real `date`, so `2023-Week50` and `Room 20240000` fall
through rather than producing a bogus date.

## Time formatting

`_iso()` → local-offset ISO 8601, microseconds dropped. Birth time
(`st_birthtime`) is used where the OS reports one (Windows, macOS, BSD), else
mtime — so on Linux the `mtime` rung genuinely is mtime.

`sort_key()` returns `datetime.min` (UTC) for anything unparseable rather than
raising: an author's odd `created:` is Hugo's problem to report, not a reason for
the sync step to abort. Naive datetimes get the local offset attached so they
compare against aware ones.

## Gotcha

A shallow clone makes every tracked file report one commit time at both ends.
`shallow_clone` is exposed so `sync_content.py` can warn; CI must use
`fetch-depth: 0`.
