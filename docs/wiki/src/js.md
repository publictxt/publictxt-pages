---
covers:
  - assets/js/site-index.js
  - assets/js/sorts.js
  - assets/js/cards.js
  - assets/js/list.js
  - assets/js/search.js
---

# assets/js/

Five ES modules, two entry points (`list.js`, `search.js`), bundled per entry by
`js.Build` (esbuild, shipped inside Hugo). No framework, no build step of its own,
no runtime dependencies.

```txt
list.js ──┬── site-index.js      search.js ──┬── cards.js
          ├── cards.js                       └── sorts.js
          └── sorts.js
```

## sorts.js — the sort vocabulary

```js
SORTS      // [[value, label], …] the six options, in menu order
FIELDS     // ["updated", "created", "title"]
normaliseSort(s)  // -> canonical "<field>[ dir]", natural direction left implicit
parseSort(s)      // -> { field, dir } with direction explicit
sortLabel(s)      // -> menu label
```

Canonical form omits the field's natural direction, so `"updated"`, `"title"` and
`"created asc"` are canonical and are what appears in `?sort=`. Imported by both
UIs so they can never drift apart.

## site-index.js — the shared fetch

```js
siteIndex()               // -> Promise<Item[]>, memoised per document
scope(items, kind, value) // -> Item[]  (section | tag | bookmarks | recent)
```

One module-level `pending` promise: every `[data-list]` on the page awaits the
same fetch. Source URL is `document.documentElement.dataset.index`. Rejects when
the attribute is missing, which `list.js` treats as "keep the fallback".

`scope()` is the client-side mirror of the template page collections — `section`
compares URL prefixes (excluding the section page itself), `tag` compares
lower-cased, `bookmarks` is prefix **or** a non-empty `bookmarks[]`, `recent`
sorts by `updated` and slices. See [D7](../decisions/D7.md).

## cards.js — the one renderer

```js
card(item, {activeTags, onTag, summaryHTML}) // -> <li class="page-card">
escapeHTML, formatDate, dateHTML, bookmarkLabel, tagURL
```

Item shape is `index.json`'s; `search.js` maps Pagefind results onto it. Tag chips
are `<button>` filter chips when `onTag` is given, plain `<a>` links otherwise.
Max 6 tag chips per card. `tagURL` resolves against `<html data-base>` for
sub-path deployments.

`formatDate` / `dateHTML` / `bookmarkLabel` are deliberate re-implementations of
`page-date.html` and `bookmark-label.html` — change both sides together.

Everything interpolated goes through `escapeHTML`, except `summaryHTML`, which is
Pagefind's own `<mark>`ed excerpt.

## list.js — browse lists

Entry point. `document.querySelectorAll("[data-list]").forEach(mount)`.

Reads from the container: `data-scope-kind`, `data-scope-value`, `data-order`,
`data-per-page`, `data-compact`.

```js
state = { sort, type, tags:Set, page, moreTags }
```

`readURL()` / `url(overrides)` / `writeURL(push)` keep state and
`?tag=&type=&sort=&page=` in sync — only non-defaults are written; `popstate`
re-reads. Compact mode skips all URL handling.

`render(pushHistory)` is the whole cycle: filter by type → filter by each tag
(AND) → `sorted()` → clamp page → slice → `card()` each → controls, pager, status
line → `writeURL`.

Facet visibility is decided **once**, from the unfiltered scope: `hasTypes` is
false when the scope has one type; `tagFacet` excludes any tag carried by every
item (a tag page's own tag). Counts are then recomputed *within* the filtered set
on each render, so chips show what selecting them would yield. Active tags outside
the visible 20 are appended so a deep-linked filter is always visible.

Pager renders first two, last two and ±2 around current, with `…` gaps; links are
real `href`s and modified clicks are let through.

`mount()` returns early on fetch failure, leaving Hugo's `<ul>` in place.

## search.js — the search page

Entry point, top-level `await`. Dynamically imports `pagefind/pagefind.js` from
`data-base`; on failure reveals `#search-unavailable` and rethrows.

```js
state = { q, type, tags:Set, sort }   // sort null until chosen
```

`sort === null` means "follow the query": relevance when there is a query,
`updated` when there isn't. `activeSort()` also downgrades a stale `relevance`
when the query is cleared.

`run()` builds `{ filters: {type, tag:[…]}, sort? }` — an **array** of tags is
Pagefind's AND — and calls `pagefind.search(q || null, opts)`. `null` query =
filter-only browse. When a sort is active, `opts.sort` replaces relevance ranking.

Results arrive as thunks; `showMore()` resolves 20 `.data()` promises at a time.
`resultCard()` maps Pagefind's shape onto the index item shape and reuses `card()`.

Filter chips render from `pagefind.filters()` (all values) with counts from the
current result set, so a zero-count chip stays visible and marked `.empty`.

URL uses `replaceState` (no history entry per keystroke); query input is debounced
200 ms.
