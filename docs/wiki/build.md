---
covers:
  - scripts/build.sh
  - scripts/build.ps1
---

# Build

```txt
sync_content.py  →  extract_hashtags.py  →  hugo  →  pagefind --site public
```

**The order is mandatory.** Each step consumes the previous one's output: hashtag
merging needs the synced copy, Hugo needs the merged front matter, Pagefind indexes
Hugo's rendered HTML in `public/`.

## Commands

`build.sh` and `build.ps1` are equivalent; both `cd` to the repo root first, so they run
from anywhere.

```console
scripts/build.sh                        # example/txt -> public/
scripts/build.sh --source ../txt        # a real repo
scripts/build.sh --serve                # sync, then hugo server (no Pagefind)
HUGO_BASEURL=https://host/ scripts/build.sh
```

```powershell
.\scripts\build.ps1 -Source C:\repo\txt   # also -Serve, -BaseUrl
```

`build.sh` also accepts the source as a bare positional argument, so workflow copies
predating `--source` keep working.

## Steps

| Step | Command | Notes |
|---|---|---|
| 1. Sync | `sync_content.py $SOURCE build/content` | Wipes `build/content`. Warns on a shallow clone. [traps](traps.md) |
| 2. Hashtags | `extract_hashtags.py build/content` | Merges body tags into front matter. [features](features/tags.md) |
| 3. Hugo | `hugo --minify [-b $HUGO_BASEURL]` | `public/` is **removed first** — Hugo does not delete stale pages from a previous build. |
| 4. Pagefind | `pagefind --site public` | Prefers `pagefind` on `PATH`, else `npx pagefind`. |

## Live preview

`--serve` / `-Serve` runs the sync steps, then `hugo server -D -M --renderStaticToDisk`:

- `-M` keeps the live-reload render in memory so it never overwrites `public/`'s
  built HTML with dev-mode markup.
- `--renderStaticToDisk` still lets the server see Pagefind's index, which pagefind
  writes straight into `public/` and which `-M` alone would hide.

**Search does not work under `--serve` until a full build has produced an index** —
the search page says so rather than failing silently. Content changes need a re-run of
the sync steps: `hugo server` watches `build/content`, not the source repo.

## Requirements

- **Hugo v0.158+**, plain or extended (no Sass, so the smaller binary is fine).
  Distro packages are often stale; check `hugo version`.
- **Python 3.10+**, no packages. `python3` in `build.sh`, `python` in `build.ps1`.
- **Pagefind**, via `npx` (Node) or the standalone binary.

`build/content/`, `public/` and `resources/_gen/` are build output and gitignored.
