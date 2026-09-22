---
covers:
  - assets/js/site-index.js
  - assets/js/sorts.js
  - assets/js/cards.js
  - assets/js/list.js
  - assets/js/search.js
---

# assets/js/

Five ES modules, two entry points, bundled per entry by `js.Build` (esbuild, shipped
inside Hugo). No framework, no runtime dependencies.

```txt
list.js ──┬── site-index.js      search.js ──┬── cards.js
          ├── cards.js                       └── sorts.js
          └── sorts.js
```

Behaviour lives in [browse lists](../features/browse-lists.md) and
[search](../features/search.md); this page is the contracts.

## assets/js/sorts.js

```js
SORTS             // [[value, label], …] the six options, in menu order
FIELDS            // ["updated", "created", "title"]
normaliseSort(s)  // -> canonical "<field>[ dir]", natural direction left implicit
parseSort(s)      // -> { field, dir } with direction explicit
sortLabel(s)      // -> menu label
```

Canonical form omits the field's natural direction, so `"updated"`, `"title"` and
`"created asc"` are canonical and are what appears in `?sort=`. Imported by both UIs, so
they cannot drift apart.

## assets/js/site-index.js

```js
siteIndex()               // -> Promise<Item[]>, memoised per document
scope(items, kind, value) // -> Item[]  (section | tag | bookmarks | recent)
```

One module-level `pending` promise, so every `[data-list]` awaits the same fetch. URL is
`document.documentElement.dataset.index`; rejects when absent, which `list.js` treats as
"keep the fallback". `scope()` mirrors the template page collections
([D7](../decisions/D7.md)).

## assets/js/cards.js

```js
card(item, {activeTags, onTag, summaryHTML}) // -> <li class="page-card">
escapeHTML, formatDate, dateHTML, bookmarkLabel, tagURL
```

Item shape is `index.json`'s. Tag chips are `<button>` filter chips when `onTag` is
given, plain links otherwise; max 6 per card. `tagURL` resolves against `<html
data-base>` for sub-path deployments. Everything interpolated goes through `escapeHTML`
except `summaryHTML`, which is Pagefind's `<mark>`ed excerpt.

`formatDate` / `dateHTML` / `bookmarkLabel` deliberately re-implement `page-date.html`
and `bookmark-label.html` — change both sides together.

## assets/js/list.js

Entry point; mounts every `[data-list]`. Reads `data-scope-kind`, `data-scope-value`,
`data-order`, `data-per-page`, `data-compact`.

```js
state = { sort, type, tags:Set, page, moreTags }
```

`readURL()` / `url(overrides)` / `writeURL(push)` keep state and the query string in
sync; only non-defaults are written, `popstate` re-reads, compact mode skips it all.
`render()`: filter by type → filter by each tag (AND) → `sorted()` → clamp page → slice
→ `card()` each → controls, pager, status → `writeURL`.

Non-obvious:

- Facet *visibility* is decided once from the unfiltered scope; *counts* are
  recomputed within the filtered set each render, so chips show what selecting them
  would yield.
- `tagFacet` excludes any tag carried by every item — that is how a tag page hides
  its own tag. Active tags outside the visible 20 are appended, so a deep-linked
  filter is always visible.
- Pager renders first two, last two and ±2 around current; links are real `href`s and
  modified clicks are let through.
- `mount()` returns early on fetch failure, leaving Hugo's `<ul>`.

## assets/js/search.js

Entry point, top-level `await`. Dynamically imports `pagefind/pagefind.js` from
`data-base`; on failure reveals `#search-unavailable` and rethrows.

```js
state = { q, type, tags:Set, sort }   // sort null until chosen
```

`sort === null` means "follow the query": relevance with one, `updated` without.
`activeSort()` downgrades a stale `relevance` when the query is cleared.

`run()` builds `{ filters: {type, tag:[…]}, sort? }` — an **array** of tags is
Pagefind's AND — and calls `pagefind.search(q || null, opts)`; `null` is a filter-only
browse, and an active sort replaces relevance ranking.

Results arrive as thunks; `showMore()` resolves 20 `.data()` promises at a time.
`resultCard()` maps Pagefind's shape onto the index item shape to reuse `card()`. Chips
render from `pagefind.filters()` (all values) with counts from the result set, so
zero-count chips stay visible and marked `.empty`. URL uses `replaceState`; input
debounced 200 ms.
