// Multi-select chip facets for list.js and search.js, so the lists and search
// read the URL and match pages alike. A value is included, excluded or
// neither — as a facet's `states` allow; includes match `all` or `any`,
// excludes match none.
//   ?tag=a&tag=b&tag-match=any&tag-not=c
// `-match` is written only when `any`: the default is `all`, which narrows and
// so needs no recount search (addsPages).

export const DEFAULT_MATCH = "all";
export const STATES = ["include", "exclude"];

// What config can't change, per key. `key` is the URL param and Pagefind filter
// (traps.md); `item` the index.json field. Lists only: `shared` shows values
// every listed page has; `limit` chips before "more".
const BUILTIN = {
  collection: { item: "collections", prefix: "", shared: true },
  category: { item: "categories", prefix: "" },
  tag: { item: "tags", prefix: "#", limit: 20 },
};

// The chip facets from config — @params' chipFacets (chip-facets.html: order,
// label, states), passed in so this module stays Hugo-free. `defs` in display order;
// the rest handle every facet at once, keyed on a caller's state object.
export function chipFacets(config) {
  const defs = config.filter((c) => c.key in BUILTIN)
    .map((c) => ({ ...BUILTIN[c.key], ...c, states: STATES.filter((s) => (c.states || STATES).includes(s)) }));
  const keys = defs.map((d) => d.key);
  return {
    defs, keys,
    read: (p = new URLSearchParams()) => Object.fromEntries(defs.map((d) => [d.key, readFacet(p, d.key, d.states)])),
    write: (p, s) => keys.forEach((k) => writeFacet(p, s[k])),
    clear: (s) => keys.forEach((k) => clearFacet(s[k])),
    anySet: (s) => keys.some((k) => isSet(s[k])),
    describe: (s) => defs.flatMap((d) => describe(s[d.key], d.prefix)),
  };
}

// Config beats the URL: a part the facet's `states` don't allow is dropped,
// not left filtering where no chip can clear it.
export function readFacet(p, key, states = STATES) {
  const match = p.get(key + "-match");
  const values = (k, s) => new Set(states.includes(s) ? p.getAll(k).filter(Boolean) : []);
  return {
    key, states,
    inc: values(key, "include"),
    exc: values(key + "-not", "exclude"),
    match: match === "any" ? "any" : DEFAULT_MATCH,
  };
}

export function writeFacet(p, f) {
  for (const v of f.inc) p.append(f.key, v);
  for (const v of f.exc) p.append(f.key + "-not", v);
  if (f.match !== DEFAULT_MATCH) p.set(f.key + "-match", f.match);
}

export const isSet = (f) => f.inc.size > 0 || f.exc.size > 0;
export function clearFacet(f) {
  f.inc.clear(); f.exc.clear(); f.match = DEFAULT_MATCH;
}

// Facet chip click: neither → each allowed state → neither.
export function nextState(f, v) {
  const order = ["", ...f.states];
  return order[(order.indexOf(chipState(f, v)) + 1) % order.length];
}
export function cycle(f, v) {
  const next = nextState(f, v);
  f.inc.delete(v); f.exc.delete(v);
  if (next === "include") f.inc.add(v);
  else if (next === "exclude") f.exc.add(v);
}
// Card tag click: include or not, never exclude. Only where `include` is allowed.
export function toggleInclude(f, v) {
  f.exc.delete(v);
  if (f.inc.has(v)) f.inc.delete(v); else f.inc.add(v);
}

// An `any` facet's chips count without its own includes: picking one adds
// pages. An `all` facet's narrow, so the result set counts them.
export const addsPages = (f) => f.match === "any" && f.inc.size > 0;

// A page's values against the facet; `ownIncludes` false for addsPages counts.
export function matches(f, values, ownIncludes = true) {
  if (values.some((v) => f.exc.has(v))) return false;
  if (!ownIncludes || !f.inc.size) return true;
  return f.match === "any" ? values.some((v) => f.inc.has(v)) : [...f.inc].every((v) => values.includes(v));
}

// The same as Pagefind conditions, for its compound `all: [...]`.
export function pagefindConditions(f, ownIncludes = true) {
  const out = [];
  if (ownIncludes && f.inc.size) out.push({ [f.key]: f.match === "any" ? { any: [...f.inc] } : [...f.inc] });
  if (f.exc.size) out.push({ [f.key]: { none: [...f.exc] } });
  return out;
}

// Status line parts: "#a or #b", "not #c".
export function describe(f, prefix = "") {
  const inc = [...f.inc].map((v) => prefix + v).join(f.match === "any" ? " or " : " · ");
  return [inc, ...[...f.exc].map((v) => "not " + prefix + v)].filter(Boolean);
}

export const chipState = (f, v) => f.inc.has(v) ? "include" : f.exc.has(v) ? "exclude" : "";

// A filter chip; `on` and `next` (the click's result) are "", "include" or
// "exclude". Excluded chips drop the count — it would always be 0.
export function filterChip(label, count, on, next, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip filter-chip" + (on === "include" ? " active" : on === "exclude" ? " excluded" : "")
    + (count === 0 && on !== "exclude" ? " empty" : "");
  b.setAttribute("aria-pressed", String(on === "include"));
  b.append(label);
  if (on === "exclude") b.setAttribute("aria-label", "not " + label);
  else {
    const n = document.createElement("span");
    n.className = "count";
    n.textContent = count;
    b.append(n);
  }
  b.title = "Click to " + (next || "clear");
  b.addEventListener("click", onClick);
  return b;
}

// "match all" / "match any" beside a facet's heading, once two values are
// included — before then the mode changes nothing. Else null.
export function matchToggle(f, onChange) {
  if (f.inc.size < 2) return null;
  const other = f.match === "any" ? "all" : "any";
  const b = document.createElement("button");
  b.type = "button";
  b.className = "match-toggle";
  b.textContent = "match " + f.match;
  b.title = `Pages with ${f.match} of the selected; click for ${other}`;
  b.addEventListener("click", () => { f.match = other; onChange(); });
  return b;
}
