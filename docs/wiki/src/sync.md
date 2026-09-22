---
covers:
  - scripts/sync_content.py
---

# scripts/sync_content.py

Copies a source repo into `build/content/`, normalising what Hugo can't handle natively
([D2](../decisions/D2.md)). 278 lines; imports only [dates.py](dates.md) and
[hashtags.py](hashtags.md). Behaviour: [sections](../features/sections.md),
[dates](../features/dates.md), [tags](../features/tags.md).

```console
python scripts/sync_content.py <source_repo> <dest_content_dir>
```

**Invariants:** source never modified; dest `rmtree`d first (a build artefact);
refuses to run when dest is the source or an ancestor of it.

## Flow — `sync(src, dest)`

1. Wipe and recreate dest. One `DateResolver` (one `git log` pass); warn on stderr if
   the repo is a shallow clone.
2. Walk `src.rglob("*")` sorted. Skip `SKIP_DIRS` at any depth
   (`.git .obsidian .trash _site node_modules`), `SKIP_FILES`
   (`README.md LICENSE LICENSE.md CONTRIBUTING.md CNAME .gitignore`), `*.gitkeep`.
3. `.md` → `normalise_md()`, written to `_index.md` when named `index.md`/`home.md`.
   Anything else → `shutil.copy2` verbatim.
4. Record each page's `Stamp`, split into `pages` and `indexes`.
5. `newest_updated_by_folder()` → `add_missing_indexes()` → `inherit_index_dates()`.

## Functions

| Function | Contract |
|---|---|
| `split_front_matter` | `(fm_or_None, body)`. Leading `---` block, CRLF-tolerant. |
| `has_key` / `front_matter_value` | Line-oriented lookup, quotes stripped. Not a YAML parser. |
| `rename_legacy_keys` | `date:`→`created:`, `lastmod:`→`updated:`, only when the target is absent. |
| `derive_title` | `(title, body)`. Uses **and removes** the first H1, only when nothing substantial precedes it (<200 chars, single line — tolerates a leading badge). |
| `stamp_for` | → `Stamp(created, created_source, updated, updated_authored)`. Front matter wins; `updated` clamped to ≥ `created`. |
| `normalise_md` | Appends only missing keys, rewrites index links, linkifies hashtags, re-emits front matter. |
| `newest_updated_by_folder` | Newest `updated` per folder, propagated to every ancestor up to dest. |
| `add_missing_indexes` | Generated `_index.md` for any folder with Markdown at any depth and no index. `created_source: children`. |
| `inherit_index_dates` | Rewrites an index's `updated:` to its newest descendant's, unless authored, absent, or already newer. |

**Title fallback:** `title:` → first H1 (removed) → for index files the **parent
folder name** → filename stem with `-`/`_` → spaces.

**Regexes:** `FRONT_MATTER_RE`, `H1_RE`, `INDEX_LINK_RE` (index/home → `_index.md`,
fragment preserved), `UPDATED_LINE_RE` (in-place index patching).

## Gotchas

- **Not a YAML parser.** Front matter is manipulated line-by-line; keys in nested
  structures or multi-line scalars are invisible. Deliberate — swap in a real parser
  rather than extending this one.
- `normalise_md` drops blank lines from existing front matter.
- `linkify` runs **after** the index-link rewrite, which expects untouched destinations.
- `index.md` and `home.md` in one folder both map to `_index.md`; the later in sort
  order wins silently.
