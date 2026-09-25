// Search page: a custom UI on the Pagefind JS API (its stock UI cannot run
// filter-only searches). Results are drawn with the same card as the browse
// lists (cards.js); the query, type, category, year, tags and sort live in the URL.
//
// Sorting is Pagefind's own (sort keys emitted by pagefind-keys.html), so it
// orders the whole result set inside the index without loading a fragment per
// hit. A sort replaces relevance ranking outright, so "Relevance" is only
// offered — and only the default — when there is a query; filter-only
// browsing defaults to newest, like the browse lists. Same facets as those
// lists, over Pagefind's index rather than index.json. Category only exists in
// the index when categories are enabled and some page has one; otherwise its
// group stays hidden.
import { card } from "./cards.js";
import { SORTS, normaliseSort, parseSort, sortLabel } from "./sorts.js";

const PAGE = 20;
const base = (document.documentElement.dataset.base || "/").replace(/\/?$/, "/");
const $ = (id) => document.getElementById(id);
const el = {
  root: $("search"), q: $("search-q"), clear: $("search-clear"), filters: $("search-filters"),
  type: $("filter-type"), category: $("filter-category"), categoryGroup: $("filter-category-group"),
  year: $("filter-year"), yearGroup: $("filter-year-group"),
  tag: $("filter-tag"), tagHint: $("filter-tag-hint"), sort: $("search-sort"),
  status: $("search-status"), list: $("search-list"), more: $("search-more"),
};

let pagefind;
try {
  pagefind = await import(base + "pagefind/pagefind.js");
  await pagefind.init();
} catch (e) {
  $("search-unavailable").hidden = false;
  throw e;
}
el.root.hidden = false;

// ---- state <-> URL --------------------------------------------------
// `sort` is null until chosen: the default then follows the query (see top).
const RELEVANCE = "relevance";
const state = { q: "", type: "", category: "", year: "", tags: new Set(), sort: null };
const hasQuery = () => state.q.trim().length > 0;
const defaultSort = () => hasQuery() ? RELEVANCE : "created";
function activeSort() {
  const s = state.sort ?? defaultSort();
  return s === RELEVANCE && !hasQuery() ? "created" : s;
}
function readURL() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  state.type = p.get("type") || "";
  state.category = p.get("category") || "";
  state.year = p.get("year") || "";
  state.tags = new Set(p.getAll("tag").filter(Boolean));
  const s = p.get("sort");
  state.sort = !s ? null : s === RELEVANCE ? RELEVANCE : normaliseSort(s);
}
function writeURL() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.type) p.set("type", state.type);
  if (state.category) p.set("category", state.category);
  if (state.year) p.set("year", state.year);
  for (const t of state.tags) p.append("tag", t);
  const sort = activeSort();
  if (state.sort && sort !== defaultSort()) p.set("sort", sort);
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}
function toggleTag(t) {
  if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
  run();
}

// ---- filter chips -------------------------------------------------------
const allFilters = await pagefind.filters();   // { tag: {name: count}, type: {…}, category: {…}, year: {…} }
const sortedKeys = (obj) => Object.keys(obj || {}).sort((a, b) => (obj[b] - obj[a]) || a.localeCompare(b));
// Years read newest-first, not most-frequent-first, like the browse lists.
const yearKeys = (obj) => Object.keys(obj || {}).sort((a, b) => b.localeCompare(a));

function chip(kind, name, count, active) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip filter-chip" + (active ? " active" : "") + (count === 0 ? " empty" : "");
  b.setAttribute("aria-pressed", String(active));
  b.append((kind === "tag" ? "#" : "") + name);
  const n = document.createElement("span");
  n.className = "count";
  n.textContent = count;
  b.append(n);
  b.addEventListener("click", () => {
    if (kind === "type" || kind === "category") { state[kind] = state[kind] === name ? "" : name; run(); }
    else toggleTag(name);
  });
  return b;
}

function renderFilters(counts) {
  // counts: filter counts within the current result set (or totals when idle)
  el.type.replaceChildren(...sortedKeys(allFilters.type).map((n) =>
    chip("type", n, (counts.type || {})[n] ?? 0, state.type === n)));
  const categories = sortedKeys(allFilters.category);
  el.categoryGroup.hidden = categories.length === 0;
  el.category.replaceChildren(...categories.map((n) =>
    chip("category", n, (counts.category || {})[n] ?? 0, state.category === n)));
  // No counts on the year options: Pagefind's are for the current result set, so a
  // single-select control would print "0" beside years that do have pages.
  const years = yearKeys(allFilters.year);
  el.yearGroup.hidden = years.length < 2;
  el.year.replaceChildren(new Option("All years", "", false, !state.year),
    ...years.map((y) => new Option(y, y, false, y === state.year)));
  el.tag.replaceChildren(...sortedKeys(allFilters.tag).map((n) =>
    chip("tag", n, (counts.tag || {})[n] ?? 0, state.tags.has(n))));
  el.tagHint.textContent = state.tags.size > 1 ? "— all selected must match" : "";
}

function renderSort() {
  const options = hasQuery() ? [[RELEVANCE, "Relevance"], ...SORTS] : SORTS;
  const cur = activeSort();
  el.sort.replaceChildren(...options.map(([v, l]) => new Option(l, v, false, v === cur)));
}

// ---- search ---------------------------------------------------------------
let shown = 0, current = [];
async function run() {
  writeURL();
  const filters = {};
  if (state.type) filters.type = state.type;
  if (state.category) filters.category = state.category;
  if (state.year) filters.year = state.year;
  if (state.tags.size) filters.tag = [...state.tags];     // array = AND
  const sort = activeSort();
  const opts = { filters };
  if (sort !== RELEVANCE) { const { field, dir } = parseSort(sort); opts.sort = { [field]: dir }; }
  const res = await pagefind.search(hasQuery() ? state.q : null, opts);
  current = res.results; shown = 0;
  el.list.replaceChildren();
  renderFilters(res.filters || allFilters);
  renderSort();
  const n = current.length;
  const what = [hasQuery() ? `“${state.q}”` : "", state.type, state.category, ...[...state.tags].map((t) => "#" + t), state.year].filter(Boolean).join(" · ");
  el.status.textContent = `${n} page${n === 1 ? "" : "s"}` + (what ? ` — ${what}` : "")
    + ` · ${sort === RELEVANCE ? "Relevance" : sortLabel(sort)}`;
  await showMore();
}

async function showMore() {
  const batch = current.slice(shown, shown + PAGE);
  const data = await Promise.all(batch.map((r) => r.data()));
  for (const d of data) el.list.appendChild(resultCard(d));
  shown += batch.length;
  el.more.hidden = shown >= current.length;
}

// A Pagefind result in the shape index.json uses (see cards.js).
function resultCard(d) {
  const item = {
    url: d.url,
    title: d.meta?.title || d.url,
    type: (d.filters?.type || [])[0] || "",
    tags: d.filters?.tag || [],
    created: d.meta?.created || "",
    updated: d.meta?.updated || "",
  };
  return card(item, { activeTags: state.tags, onTag: toggleTag, summaryHTML: d.excerpt || "" });
}

// ---- wiring -------------------------------------------------------------
let timer;
el.q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { state.q = el.q.value; run(); }, 200); });
el.sort.addEventListener("change", () => { state.sort = el.sort.value; run(); });
el.year.addEventListener("change", () => { state.year = el.year.value; run(); });
el.clear.addEventListener("click", () => { state.q = ""; state.type = ""; state.category = ""; state.year = ""; state.tags.clear(); state.sort = null; el.q.value = ""; run(); el.q.focus(); });
el.more.addEventListener("click", showMore);
window.addEventListener("popstate", () => { readURL(); el.q.value = state.q; run(); });

readURL();
el.q.value = state.q;
// Below the stacking breakpoint (main.css, 900px) the filters sit above the
// results: start folded unless a filter is in use, so results show without
// scrolling. Once, at load; after that the reader's toggling stands.
if (matchMedia("(max-width: 900px)").matches) {
  el.filters.open = Boolean(state.type || state.category || state.year || state.tags.size);
}
await run();
if (!state.q) el.q.focus();
