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
merging needs the synced copy, Hugo needs the merged front matter, and Pagefind
indexes Hugo's rendered HTML in `public/`.

## Commands

```console
scripts/build.sh                        # example/txt -> public/
scripts/build.sh --source ../txt        # a real repo
scripts/build.sh --serve                # sync, then hugo server (no Pagefind)
HUGO_BASEURL=https://host/ scripts/build.sh
```

```powershell
.\scripts\build.ps1
.\scripts\build.ps1 -Source C:\repo\txt
.\scripts\build.ps1 -Serve
.\scripts\build.ps1 -BaseUrl https://host/
```

The two scripts are equivalent. `build.sh` also accepts the source as a bare
positional argument, so workflow copies predating `--source` keep working; it
rejects unknown options and a second positional.

## What each step does

| Step | Command | Notes |
|---|---|---|
| 1. Sync | `python scripts/sync_content.py $SOURCE build/content` | Wipes `build/content`. Warns on a shallow clone. [src](src/sync.md) |
| 2. Hashtags | `python scripts/extract_hashtags.py build/content` | Merges body `#tags` into front matter. [src](src/hashtags.md) |
| 3. Hugo | `hugo --minify [-b $HUGO_BASEURL]` | `public/` is **removed first** — Hugo does not delete stale pages from a previous build. |
| 4. Pagefind | `pagefind --site public` | Prefers a `pagefind` on `PATH`, else `npx pagefind`. |

Both scripts `cd` to the repo root first, so they can be run from anywhere.

## Live preview

`--serve` / `-Serve` runs the sync steps, then:

```console
hugo server -D -M --renderStaticToDisk
```

- `-M` keeps the live-reload render in memory so it never overwrites `public/`'s
  built HTML with dev-mode markup.
- `--renderStaticToDisk` is what still lets the server see Pagefind's index, which
  `pagefind` writes straight into `public/` after a full build and which `-M`
  alone would hide.

**Search does not work under `--serve` until a full build has produced an index.**
The search page says so rather than failing silently. Content changes need a
re-run of the sync steps — `hugo server` watches `build/content`, not the source
repo.

## Requirements

- **Hugo v0.158+**, plain or extended (no Sass, so the smaller binary is fine).
  Distro packages are often stale; check `hugo version`.
- **Python 3.10+**, no packages. `python3` in `build.sh`, `python` in `build.ps1`.
- **Pagefind**, via `npx` (Node) or the standalone binary.

## Generated paths

`build/content/`, `public/` and `resources/_gen/` are all build output and all
gitignored. Never edit them; re-run the pipeline.
