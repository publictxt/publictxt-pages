// Multi-select chip facets for list.js and search.js, so the lists and search
// read the URL and match pages alike. A value is included, excluded or
// neither — as a facet's `states` allow; includes match `all` or `any`, as its
// `modes` allow, excludes match none.
//   ?tag=a&tag=b&tag-match=any&tag-not=c
// `-match` is written only off the facet's default, modes[0] — so a URL
// without it means whatever the config's default is now. Likewise a list's
// default filter (`filter:`, chipFacets().write).

import { ratingFilterLabel, UNRATED_FILTER } from "./cards.js";

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
  const read = (p = new URLSearchParams()) => Object.fromEntries(defs.map((d) => [d.key, readFacet(p, d.key, d.states, d.modes)]));
  const same = (a, b) => keys.every((k) => sameFacet(a[k], b[k]));
  const inURL = (p) => keys.some((k) => [k, k + "-not", k + "-match"].some((n) => p.has(n)));
  return {
    defs, keys, read, same,
    // A list's default filter `d` (list.js, data-filter) holds while the URL
    // has no chip-facet param; with one, the URL is the whole chip state. So
    // at `d`, write nothing; cleared off `d`, write an empty `<key>-not=`.
    readOr: (p, d) => inURL(p) ? read(p) : d,
    write: (p, s, d) => {
      if (d && same(s, d)) return;
      keys.forEach((k) => writeFacet(p, s[k]));
      if (d && !inURL(p)) p.set((keys.find((k) => isSet(d[k])) ?? keys[0]) + "-not", "");
    },
    clear: (s) => keys.forEach((k) => clearFacet(s[k])),
    anySet: (s) => keys.some((k) => isSet(s[k])),
    describe: (s) => defs.flatMap((d) => describe(s[d.key], d.prefix)),
  };
}

const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
const sameFacet = (a, b) => a.match === b.match && sameSet(a.inc, b.inc) && sameSet(a.exc, b.exc);

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
    x.textContent = "✕";
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

// ---- filter sections --------------------------------------------------
// Each filter section (rating, tag, …) is a <details> the reader can shut,
// remembered per browser for lists and search alike. Storage can throw or be
// empty; then every section starts open. Read lazily: tests have no storage.
const SHUT_KEY = "facets-shut";
let shutKeys;
function shut() {
  if (!shutKeys) {
    try { shutKeys = new Set(JSON.parse(localStorage.getItem(SHUT_KEY)) || []); } catch { shutKeys = new Set(); }
  }
  return shutKeys;
}

// Opens or shuts `details` as remembered for `key`, and remembers its toggles.
export function rememberFold(details, key) {
  details.open = !shut().has(key);
  details.addEventListener("toggle", () => {
    if (details.open) shut().delete(key); else shut().add(key);
    try { localStorage.setItem(SHUT_KEY, JSON.stringify([...shut()])); } catch { /* this page only, then */ }
  });
}

// What goes after a section's label: a badge of how many values are picked
// (main.css shows it only while shut), then the match toggle. In a <summary>,
// a button's click would also shut the section, so the toggle's doesn't.
export function foldHint(picked, toggle) {
  const out = [];
  if (picked) {
    const badge = document.createElement("span");
    badge.className = "facet-badge";
    badge.textContent = picked;
    badge.title = `${picked} selected`;
    out.push(badge);
  }
  if (toggle) {
    toggle.addEventListener("click", (e) => e.preventDefault());
    out.push(toggle);
  }
  return out;
}

// ---- rating -------------------------------------------------------------
// {"5": n, "4": n, "unrated": n} exact counts -> the same keys counting that
// rating or better, as a `?rating=` minimum filters. Unrated stays exact.
export function ratingCounts(exact) {
  const out = {};
  for (const r of ["1", "2", "3", "4", "5"]) {
    out[r] = Object.entries(exact).reduce((sum, [k, c]) => sum + (k !== UNRATED_FILTER && Number(k) >= Number(r) ? c : 0), 0);
  }
  out[UNRATED_FILTER] = exact[UNRATED_FILTER] || 0;
  return out;
}

// Rating chips, one at a time: `values` the ratings to offer ("5"…"1",
// "unrated"), `counts` per ratingCounts(), `current` the ?rating= value.
// Pressing the set chip clears it. `onPick(value)` then.
export function ratingChips(values, counts, current, onPick) {
  return values.map((v) => {
    const on = v === current;
    const label = ratingFilterLabel(v);
    const count = counts[v] || 0;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip filter-chip" + (on ? " active" : "") + (count === 0 && !on ? " empty" : "");
    b.setAttribute("aria-pressed", String(on));
    b.title = on ? "Click to clear" : "Click to show " + label;
    const n = document.createElement("span");
    n.className = "count";
    n.textContent = count;
    b.append(label, n);
    b.addEventListener("click", () => onPick(on ? "" : v));
    return b;
  });
}
