---
covers:
  - scripts/build.sh
  - scripts/build.ps1
  - tests
  - .github/workflows/test.yml
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

Both scripts `cd` to the repo root. Sync wipes `build/content` and rewrites
`build/site.toml` from the source's `settings/site.toml`, overlaid on `hugo.toml` when
present ([deploy.md](deploy.md)); `public/` is removed
before `hugo`, which doesn't delete stale pages. Pagefind runs from `PATH`, else `npx`.

**`--serve`** runs `hugo server -D -M --renderStaticToDisk`: `-M` keeps dev markup out
of `public/`, and `--renderStaticToDisk` still serves Pagefind's index from there. So
search needs a prior full build, and content changes need the sync re-run — the
server watches `build/content`, not the source.

**Needs:** Hugo 0.158+ (plain is fine — no Sass), Python 3.10+, Pagefind (binary or
`npx`).

## Tests

Python stdlib `unittest`, no dependencies; covers the pipeline up to Hugo.

```console
python -m unittest                                  # all
GOLDEN_UPDATE=1 python -m unittest tests.test_golden  # refresh the snapshot
```

CI: `.github/workflows/test.yml`, on push to `main` and every PR — Python 3.10 on
Linux (the floor), latest on Windows (CRLF output).

**Golden**: sync + hashtags over `example/txt/`, compared with `tests/golden/`
(text by content, the rest by path; Git dates fixed). Refresh after an intended
change **and read the diff** — reviewing it is the test. Each example file covers a
case, listed in `example/txt/README.md`; a new case gets a new small file.

## JS modules

No Node: Hugo's built-in esbuild (`js.Build`) bundles each **entry point** with
everything it imports into one file. Two entry points:

```txt
list-container.html → list.js    + facets.js, cards.js, sorts.js, site-index.js
search.html         → search.js  + facets.js, cards.js, sorts.js
```

Shared modules are **copied into each bundle** — two independent `facets.js`, one per
page type. So anything set per `js.Build` call (options, `params` → `@params`) must match
across both calls, or lists and search drift apart silently — hence `js-params.html`, the
one source of `@params`.
