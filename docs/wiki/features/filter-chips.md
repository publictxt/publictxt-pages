---
covers:
  - assets/js/facets.js
  - layouts/_partials/chip-facets.html
  - layouts/_partials/js-params.html
---

# Filter chips

Collection, category and tag chips in [browse lists](browse-lists.md) and
[search](search.md): one module, `facets.js`, so both read the URL and match pages alike.

**Config.** `[[params.chipFacets]]` in `hugo.toml`: order, `label`, `states`, `match`; leave a
key out to drop its chips. `chip-facets.html` checks it (unknown or repeated keys warned) and
is the one source for `search.html`'s groups and, via `js-params.html`, both bundles'
`@params` ([build.md](../build.md#js-modules)). `facets.js` stays Hugo-free:
`chipFacets(config)` merges each entry over its `BUILTIN` (index field, `#` prefix,
lists-only `shared` / `limit`). Keys are fixed — see [traps.md](../traps.md).

**Behaviour.** A chip's body toggles its facet's first state (`states`, default include,
exclude); with both, a ✕ toggles exclude (`press()`). Neither passes through the opposite
filter on the way to off. The ✕ shows on set chips, else on hover / focus — not on touch,
where you include, then ✕. With two includes, a toggle sets match all / any if
`match` allows both; its first is the default, which `?tag-match=` omits. Config beats
the URL: `readFacet` drops what `states` / `match` disallow, so nothing filters that no
chip can clear. A facet matching *any* counts without its own includes, since picking a
value adds pages (`addsPages`). A card's tags only include — and link instead when
tag can't.
