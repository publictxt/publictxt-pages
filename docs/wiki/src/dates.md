---
covers:
  - scripts/dates.py
---

# [dates.py](../../../scripts/dates.py)

The single source of truth for when a page is from. Imported by
[sync_content.py](sync.md); separate for the same reason as
[hashtags.py](hashtags.md) — one definition, so nothing downstream can disagree.
Ladders and rationale: [features/dates.md](../features/dates.md),
[D4](../decisions/D4.md).

```python
class DateResolver:
    def __init__(self, src: Path)                   # one git log pass; once per sync
    git_times: dict[str, tuple[str, str]]           # rel -> (created, updated)
    shallow_clone: bool
    built_at: str
    def created(self, path, rel) -> tuple[str, str] # (iso, rung)
    def updated(self, path, rel) -> str

date_from_path(rel) -> str | None
git_commit_times(src) -> tuple[dict, bool]
build_time() -> str
sort_key(iso) -> datetime                           # comparable; unparseable sorts last
```

`created()` / `updated()` are called only for files with no explicit front matter
value — the `front-matter` rung is applied by `sync_content.stamp_for`.

## `git_commit_times`

One `git log --format=%x00%cI --name-only --no-renames -- .` pass.

- Output paths are relative to the **repo root**, which may sit above `src`;
  `rev-parse --show-prefix` gives the prefix to strip, and files outside it are
  skipped. This is what makes a source repo nested in a larger one work.
- `git log` is newest-first: the **first** sighting of a path is its `updated`, every
  later (older) sighting pushes `created` back.
- A NUL prefixes the commit header, because a filename could look like a date line.
  `core.quotepath=false` keeps non-ASCII filenames readable.
- Returns `({}, False)` when git is unavailable or `src` isn't a working tree — an
  unversioned repo just falls to the next rung.
- `--no-renames`: a renamed file is "created" by the rename. Following renames would
  be truer but much slower.

## Matching and formatting

`NAME_DATE_RES` tries `YYYY-MM-DD` then `YYYYMMDD` **in the stem**, each digit-guarded
so longer runs don't match; `PATH_DATE_RE` then tries `.../YYYY/MM/DD/` anywhere — not
blog-only. `_valid()` builds a real `date`, so `2023-Week50` falls through rather than
producing a bogus one.

`_iso()` → local-offset ISO 8601, microseconds dropped. `st_birthtime` where the OS
reports one, else mtime — so on Linux the `mtime` rung genuinely is mtime.

`sort_key()` returns `datetime.min` (UTC) for anything unparseable rather than
raising: an odd authored `created:` is Hugo's problem to report, not a reason to
abort. Naive datetimes get the local offset so they compare against aware ones.

**Gotcha:** a shallow clone makes every tracked file report one commit time at both
ends. `shallow_clone` is exposed so sync can warn; CI must use `fetch-depth: 0`.
