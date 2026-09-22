---
covers:
  - scripts/sync_content.py
---

# scripts/sync_content.py

Copies a source repo into `build/content/`, normalising what Hugo can't handle
natively ([D2](../decisions/D2.md)). 278 lines, no dependencies beyond `dates.py`
and `hashtags.py`.

```console
python scripts/sync_content.py <source_repo> <dest_content_dir>
```

**Invariants:** the source is never modified; the destination is `rmtree`d first
(treat it as a build artefact); refuses to run when dest is the source or an
ancestor of it.

## Flow

`sync(src, dest)`:

1. Wipe and recreate `dest`. Construct one `DateResolver` (one `git log` pass);
   warn on stderr if the repo is a shallow clone.
2. Walk `src.rglob("*")` sorted. Skip `SKIP_DIRS` at any depth
   (`.git .obsidian .trash _site node_modules`), `SKIP_FILES`
   (`README.md LICENSE LICENSE.md CONTRIBUTING.md CNAME .gitignore`) and `*.gitkeep`.
3. `.md` → `normalise_md()`, written to `_index.md` when named `index.md`/`home.md`.
   Anything else → `shutil.copy2` verbatim.
4. Record each page's `Stamp`, split into `pages` and `indexes`.
5. `newest_updated_by_folder()` → `add_missing_indexes()` → `inherit_index_dates()`.

Returns `(md_count, other_count)`.

## Key functions

| Function | Contract |
|---|---|
| `split_front_matter(text)` | `(fm_or_None, body)`. Regex on leading `---` block, CRLF-tolerant. |
| `has_key(fm, key)` / `front_matter_value(fm, key)` | Line-oriented lookup; value has quotes stripped. Not a YAML parser. |
| `rename_legacy_keys(fm)` | `date:`→`created:`, `lastmod:`→`updated:`, only when the target key is absent. |
| `derive_title(body, fallback)` | `(title, body)`. Uses **and removes** the first H1, but only when nothing substantial precedes it (<200 chars, single line — tolerates a leading badge or link). |
| `stamp_for(fm, path, rel, resolver)` | → `Stamp(created, created_source, updated, updated_authored)`. Front matter wins; `updated` clamped to ≥ `created`. |
| `normalise_md(text, rel, stamp)` | Appends only the missing keys, rewrites index links, linkifies hashtags, re-emits front matter. |
| `newest_updated_by_folder(dest, pages)` | Newest `updated` per folder, propagated to every ancestor up to `dest`. |
| `add_missing_indexes(dest, built_at, newest)` | Generated `_index.md` for any folder with Markdown at any depth and no index. `created_source: children`. |
| `inherit_index_dates(indexes, newest)` | Rewrites an index's `updated:` line to its newest descendant's, unless authored, absent, or already newer. |

## Title fallback order

front matter `title:` → first H1 (removed) → for `index.md`/`home.md`, the
**parent folder name** → the filename stem, with `-`/`_` → spaces.

## Regexes

| Name | Purpose |
|---|---|
| `FRONT_MATTER_RE` | leading `---` block, `DOTALL`, CRLF-tolerant |
| `H1_RE` | `^# ` heading, multiline |
| `INDEX_LINK_RE` | `](…index.md#frag)` → `](…_index.md#frag)`, fragment preserved |
| `UPDATED_LINE_RE` | the `updated:` line, for in-place index patching |

## Gotchas

- **Not a YAML parser.** Front matter is manipulated line-by-line. Keys inside
  nested structures or multi-line scalars will not be seen. Deliberate — if
  richer YAML is ever needed, swap in a real parser rather than extending this.
- `normalise_md` drops blank lines from existing front matter (`if l.strip()`).
- `linkify` runs on the whole body **after** the index-link rewrite. Order matters:
  a hashtag inside a link is protected, so linkifying first would be safe, but the
  index rewrite expects untouched destinations.
- Two files named `index.md` and `home.md` in the same folder both map to
  `_index.md` — the later one in sort order wins silently.

## Callers

`scripts/build.sh` / `build.ps1`, step 1. Feature pages:
[sections](../features/sections.md), [dates](../features/dates.md),
[tags](../features/tags.md).
