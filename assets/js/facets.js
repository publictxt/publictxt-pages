// Multi-select facets (tags, categories) for list.js and search.js, so the
// lists and search read the URL and match pages alike. A value is included,
// excluded or neither; includes match `all` or `any`, excludes match none.
//   ?tag=a&tag=b&tag-match=any&tag-not=c
// `-match` is written only when not the default: tags all, categories any.

export const DEFAULT_MATCH = { tag: "all", category: "any" };

export function readFacet(p, key) {
  const match = p.get(key + "-match");
  return {
    key,
    inc: new Set(p.getAll(key).filter(Boolean)),
    exc: new Set(p.getAll(key + "-not").filter(Boolean)),
    match: match === "all" || match === "any" ? match : DEFAULT_MATCH[key],
  };
}
export const emptyFacet = (key) => readFacet(new URLSearchParams(), key);

export function writeFacet(p, f) {
  for (const v of f.inc) p.append(f.key, v);
  for (const v of f.exc) p.append(f.key + "-not", v);
  if (f.match !== DEFAULT_MATCH[f.key]) p.set(f.key + "-match", f.match);
}

export const isSet = (f) => f.inc.size > 0 || f.exc.size > 0;
export function clearFacet(f) {
  f.inc.clear(); f.exc.clear(); f.match = DEFAULT_MATCH[f.key];
}

// Facet chip click: neither → included → excluded → neither.
export function cycle(f, v) {
  if (f.inc.has(v)) { f.inc.delete(v); f.exc.add(v); }
  else if (f.exc.has(v)) f.exc.delete(v);
  else f.inc.add(v);
}
// Card tag click: include or not, never exclude.
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

// A filter chip; `on` is "", "include" or "exclude". Excluded chips drop the
// count — it would always be 0. `triState` titles the next click.
export function filterChip(label, count, on, onClick, triState = false) {
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
  if (triState) b.title = on === "include" ? "Click to exclude" : on === "exclude" ? "Click to clear" : "Click to include";
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
