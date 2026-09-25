---
covers:
  - scripts/build.sh
  - scripts/build.ps1
---

# Build

```txt
sync_content.py  →  extract_hashtags.py  →  hugo  →  pagefind --site public
```

Order is mandatory: each step reads the previous one's output.

```console
scripts/build.sh                        # example/txt -> public/
scripts/build.sh --source ../txt        # a real repo (bare path also works)
scripts/build.sh --serve                # sync, then hugo server
HUGO_BASEURL=https://host/ scripts/build.sh
```

```powershell
.\scripts\build.ps1 -Source C:\repo\txt   # also -Serve, -BaseUrl
```

Both scripts `cd` to the repo root. Sync wipes `build/content`; `public/` is removed
before `hugo`, which doesn't delete stale pages. Pagefind runs from `PATH`, else `npx`.

**`--serve`** runs `hugo server -D -M --renderStaticToDisk`: `-M` keeps dev markup out
of `public/`, and `--renderStaticToDisk` still serves Pagefind's index from there. So
search needs a prior full build, and content changes need the sync re-run — the
server watches `build/content`, not the source.

**Needs:** Hugo 0.158+ (plain is fine — no Sass), Python 3.10+, Pagefind (binary or
`npx`).
