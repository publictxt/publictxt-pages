// Multi-select chip facets for list.js and search.js, so the lists and search
// read the URL and match pages alike. A value is included, excluded or
// neither — as a facet's `states` allow; includes match `all` or `any`, as its
// `modes` allow, excludes match none.
//   ?tag=a&tag=b&tag-match=any&tag-not=c
// `-match` is written only off the facet's default, modes[0] — so a URL
// without it means whatever the config's default is now.

export const STATES = ["include", "exclude"];
export const MODES = ["all", "any"];

// What config can't change, per key. `key` is the URL param and Pagefind filter
// (traps.md); `item` the index.json field. Lists only: `shared` shows values
// every listed page has; `limit` chips before "more".
const BUILTIN = {
  collection: { item: "collections", prefix: "", shared: true },
  category: { item: "categories", prefix: "" },
  tag: { item: "tags", prefix: "#", limit: 20 },
};

// The chip facets from config — @params' chipFacets (chip-facets.html: order,
// label, states, match → `modes`), passed in so this module stays Hugo-free. `defs` in display order;
// the rest handle every facet at once, keyed on a caller's state object.
export function chipFacets(config) {
  const allowed = (all, want) => { const ok = (want || []).filter((v) => all.includes(v)); return ok.length ? ok : all; };
  const defs = config.filter((c) => c.key in BUILTIN)
    .map((c) => ({ ...BUILTIN[c.key], ...c, states: allowed(STATES, c.states), modes: allowed(MODES, c.match) }));
  const keys = defs.map((d) => d.key);
  return {
    defs, keys,
    read: (p = new URLSearchParams()) => Object.fromEntries(defs.map((d) => [d.key, readFacet(p, d.key, d.states, d.modes)])),
    write: (p, s) => keys.forEach((k) => writeFacet(p, s[k])),
    clear: (s) => keys.forEach((k) => clearFacet(s[k])),
    anySet: (s) => keys.some((k) => isSet(s[k])),
    describe: (s) => defs.flatMap((d) => describe(s[d.key], d.prefix)),
  };
}

// Config beats the URL: a part the facet's `states` or `modes` don't allow is
// dropped, not left filtering where no chip can clear it.
export function readFacet(p, key, states = STATES, modes = MODES) {
  const match = p.get(key + "-match");
  const values = (k, s) => new Set(states.includes(s) ? p.getAll(k).filter(Boolean) : []);
  return {
    key, states, modes,
    inc: values(key, "include"),
    exc: values(key + "-not", "exclude"),
    match: modes.includes(match) ? match : modes[0],
  };
}

export function writeFacet(p, f) {
  for (const v of f.inc) p.append(f.key, v);
  for (const v of f.exc) p.append(f.key + "-not", v);
  if (f.match !== f.modes[0]) p.set(f.key + "-match", f.match);
}

export const isSet = (f) => f.inc.size > 0 || f.exc.size > 0;
export function clearFacet(f) {
  f.inc.clear(); f.exc.clear(); f.match = f.modes[0];
}

// Facet chip press. Body: set → off, off → the facet's first state. ✕ (both
// states allowed): excluded → off, else excluded. Never passes through the
// opposite filter on the way to off.
export function press(f, v, x = false) {
  const was = chipState(f, v);
  const next = x ? (was === "exclude" ? "" : "exclude") : (was ? "" : f.states[0]);
  f.inc.delete(v); f.exc.delete(v);
  if (next) (next === "include" ? f.inc : f.exc).add(v);
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

// A filter chip for facet `f`: a body button and, with both states allowed,
// a ✕ that excludes (main.css shows it on set chips, else on hover / focus).
// `onPress(x)` after press(). Excluded chips drop the count — always 0.
export function filterChip(f, v, label, count, onPress) {
  const on = chipState(f, v);
  const withX = f.states.length > 1;
  const wrap = document.createElement("span");
  wrap.className = "chip filter-chip" + (on === "include" ? " active" : on === "exclude" ? " excluded" : "")
    + (count === 0 && on !== "exclude" ? " empty" : "");
  const button = (cls, x) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.addEventListener("click", () => { press(f, v, x); onPress(); });
    wrap.append(b);
    return b;
  };
  const body = button("chip-body", false);
  body.append(label);
  body.setAttribute("aria-pressed", String(withX ? on === "include" : on !== ""));
  if (on === "exclude") body.setAttribute("aria-label", "not " + label);
  else {
    const n = document.createElement("span");
    n.className = "count";
    n.textContent = count;
    body.append(n);
  }
  body.title = on ? "Click to clear" : "Click to " + f.states[0] + (withX ? "; ✕ to exclude" : "");
  if (withX) {
    const x = button("chip-x", true);
    x.textContent = "×";
    x.setAttribute("aria-pressed", String(on === "exclude"));
    x.setAttribute("aria-label", (on === "exclude" ? "Stop excluding " : "Exclude ") + label);
    x.title = on === "exclude" ? "Stop excluding" : "Exclude";
  }
  return wrap;
}

// "match all" / "match any" beside a facet's heading, once two values are
// included — before then the mode changes nothing — and both modes allowed.
// Else null.
export function matchToggle(f, onChange) {
  if (f.inc.size < 2 || f.modes.length < 2) return null;
  const other = f.modes.find((m) => m !== f.match);
  const b = document.createElement("button");
  b.type = "button";
  b.className = "match-toggle";
  b.textContent = "match " + f.match;
  b.title = `Pages with ${f.match} of the selected; click for ${other}`;
  b.addEventListener("click", () => { f.match = other; onChange(); });
  return b;
}
