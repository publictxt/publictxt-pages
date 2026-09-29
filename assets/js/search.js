// Search page: custom UI on the Pagefind JS API (the stock UI can't search
// filters alone). Same cards, facets and URL spelling as the browse lists.
//
// Sorting is Pagefind's, on pagefind-keys.html's keys, and replaces relevance
// outright: "Relevance" is offered, and default, only with a query. Rating is
// a minimum: `?rating=4` = any of "4", "5"; `unrated` is its own value.
// Chip facets (CHIPS, from config): include / exclude / any-or-all, as facets.js.
import { card, ratingFilter, ratingFilterLabel, UNRATED_FILTER } from "./cards.js";
import * as params from "@params";   // js-params.html
import { addsPages, chipFacets, filterChip, matchToggle, pagefindConditions,
  toggleInclude } from "./facets.js";
import { SORTS, normaliseSort, parseSort, sortLabel } from "./sorts.js";

const CHIPS = chipFacets(params.chipFacets);
const PAGE = 20;
const TYPING_MS = 400;   // pause before a keystroke searches; Enter searches now
const base = (document.documentElement.dataset.base || "/").replace(/\/?$/, "/");
const $ = (id) => document.getElementById(id);
const el = {
  root: $("search"), q: $("search-q"), clear: $("search-clear"), filters: $("search-filters"),
  year: $("filter-year"), yearGroup: $("filter-year-group"),
  rating: $("filter-rating"), ratingGroup: $("filter-rating-group"), sort: $("search-sort"),
  status: $("search-status"), list: $("search-list"), more: $("search-more"),
};
// Per chip facet, search.html's filter-{key}-group / filter-{key} / filter-{key}-hint.
const groups = Object.fromEntries(CHIPS.keys.map((k) => [k, {
  group: $(`filter-${k}-group`), chips: $(`filter-${k}`), hint: $(`filter-${k}-hint`),
}]));

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
// `sort` null = not chosen, so the default follows the query.
const RELEVANCE = "relevance";
const state = { q: "", ...CHIPS.read(), year: "", rating: "", sort: null };
const filtering = () => Boolean(CHIPS.anySet(state) || state.year || state.rating);
const hasQuery = () => state.q.trim().length > 0;
const defaultSort = () => hasQuery() ? RELEVANCE : "created";
function activeSort() {
  const s = state.sort ?? defaultSort();
  return s === RELEVANCE && !hasQuery() ? "created" : s;
}
function readURL() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  Object.assign(state, CHIPS.read(p));
  state.year = p.get("year") || "";
  state.rating = ratingFilter(p.get("rating"));
  const s = p.get("sort");
  state.sort = !s ? null : s === RELEVANCE ? RELEVANCE : normaliseSort(s);
}
function writeURL() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  CHIPS.write(p, state);
  if (state.year) p.set("year", state.year);
  if (state.rating) p.set("rating", state.rating);
  const sort = activeSort();
  if (state.sort && sort !== defaultSort()) p.set("sort", sort);
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}
// Card tags filter only while tag is a chip facet that includes; else they link.
const toggleTag = state.tag?.states.includes("include") ? (t) => { toggleInclude(state.tag, t); run(); } : null;

// ---- filter chips -------------------------------------------------------
const allFilters = await pagefind.filters();   // { tag: {name: count}, collection: {…}, category: {…}, year: {…}, rating: {…} }
const sortedKeys = (obj) => Object.keys(obj || {}).sort((a, b) => (obj[b] - obj[a]) || a.localeCompare(b));
// Years newest-first, as in the browse lists.
const yearKeys = (obj) => Object.keys(obj || {}).sort((a, b) => b.localeCompare(a));

function chip(d, name, count) {
  return filterChip(state[d.key], name, d.prefix + name, count, run);
}

// counts: filter counts within the current result set (or totals when idle);
// facetCounts: chip facet counts, per addsPages(). A chip facet the index
// lacks hides — categories when disabled.
function renderFilters(counts, facetCounts) {
  for (const d of CHIPS.defs) {
    const g = groups[d.key];
    const names = sortedKeys(allFilters[d.key]);
    g.group.hidden = names.length === 0;
    g.chips.replaceChildren(...names.map((n) => chip(d, n, (facetCounts[d.key] || {})[n] ?? 0)));
    g.hint.replaceChildren(...[matchToggle(state[d.key], run)].filter(Boolean));
  }
  // No year counts: Pagefind's are per result set, so would read "0" beside real years.
  const years = yearKeys(allFilters.year);
  el.yearGroup.hidden = years.length < 2;
  el.year.replaceChildren(new Option("All years", "", false, !state.year),
    ...years.map((y) => new Option(y, y, false, y === state.year)));
  // Likewise, and they'd be per exact value, not "or better".
  const ratings = Object.keys(allFilters.rating || {}).filter((r) => r !== UNRATED_FILTER).sort((a, b) => b - a);
  const hasUnrated = UNRATED_FILTER in (allFilters.rating || {});
  el.ratingGroup.hidden = ratings.length === 0;
  el.rating.replaceChildren(new Option("Any rating", "", false, !state.rating),
    ...ratings.map((r) => new Option(ratingFilterLabel(r), r, false, r === state.rating)),
    ...(hasUnrated ? [new Option("Unrated", UNRATED_FILTER, false, state.rating === UNRATED_FILTER)] : []));
}

function renderSort() {
  const options = hasQuery() ? [[RELEVANCE, "Relevance"], ...SORTS] : SORTS;
  const cur = activeSort();
  el.sort.replaceChildren(...options.map(([v, l]) => new Option(l, v, false, v === cur)));
}

// ---- search ---------------------------------------------------------------
// Pagefind filters for the state; `skip` names a facet whose includes are
// left out (its addsPages counts).
function pagefindFilters(skip) {
  const filters = {};
  if (state.year) filters.year = state.year;
  if (state.rating === UNRATED_FILTER) filters.rating = UNRATED_FILTER;
  else if (state.rating) filters.rating = { any: ["1", "2", "3", "4", "5"].slice(Number(state.rating) - 1) };
  const all = CHIPS.keys.flatMap((k) => pagefindConditions(state[k], k !== skip));
  if (all.length) filters.all = all;
  return filters;
}

let shown = 0, current = [], runs = 0;
async function run() {
  const id = ++runs;
  writeURL();
  const sort = activeSort();
  const opts = { filters: pagefindFilters() };
  if (sort !== RELEVANCE) { const { field, dir } = parseSort(sort); opts.sort = { [field]: dir }; }
  const query = hasQuery() ? state.q : null;
  // An addsPages facet counts from a search without its includes, or the
  // totals when nothing else narrows.
  const recount = CHIPS.keys.filter((k) => addsPages(state[k]));
  const without = (k) => {
    const filters = pagefindFilters(k);
    return query || Object.keys(filters).length ? pagefind.search(query, { filters }) : null;
  };
  const [res, ...others] = await Promise.all([pagefind.search(query, opts), ...recount.map(without)]);
  if (id !== runs) return;   // superseded while searching
  current = res.results; shown = 0;
  el.list.replaceChildren();
  const counts = res.filters || allFilters;
  const facetCounts = Object.fromEntries(CHIPS.keys.map((k) => {
    const i = recount.indexOf(k);
    return [k, i < 0 ? counts[k] : (others[i]?.filters || allFilters)[k]];
  }));
  renderFilters(counts, facetCounts);
  renderSort();
  const n = current.length;
  const what = [hasQuery() ? `“${state.q}”` : "", ...CHIPS.describe(state), state.year,
    state.rating && ratingFilterLabel(state.rating)].filter(Boolean).join(" · ");
  el.status.textContent = `${n} page${n === 1 ? "" : "s"}` + (what ? ` — ${what}` : "")
    + ` · ${sort === RELEVANCE ? "Relevance" : sortLabel(sort)}`;
  await showMore();
}

async function showMore() {
  const mine = current;
  const batch = current.slice(shown, shown + PAGE);
  const data = await Promise.all(batch.map((r) => r.data()));
  if (mine !== current) return;   // a newer run replaced the list
  for (const d of data) el.list.appendChild(resultCard(d));
  shown += batch.length;
  el.more.hidden = shown >= current.length;
}

// A Pagefind result in the shape index.json uses (see cards.js).
function resultCard(d) {
  const item = {
    url: d.url,
    title: d.meta?.title || d.url,
    collections: d.filters?.collection || [],
    tags: d.filters?.tag || [],
    created: d.meta?.created || "",
    updated: d.meta?.updated || "",
    rating: Number(d.meta?.rating) || 0,
  };
  return card(item, { activeTags: state.tag?.inc, onTag: toggleTag, summaryHTML: d.excerpt || "" });
}

// ---- wiring -------------------------------------------------------------
let timer;
const typed = () => { clearTimeout(timer); state.q = el.q.value; run(); };
el.q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(typed, TYPING_MS); });
el.q.addEventListener("keydown", (e) => { if (e.key === "Enter") typed(); });
el.sort.addEventListener("change", () => { state.sort = el.sort.value; run(); });
el.year.addEventListener("change", () => { state.year = el.year.value; run(); });
el.rating.addEventListener("change", () => { state.rating = el.rating.value; run(); });
el.clear.addEventListener("click", () => { state.q = ""; CHIPS.clear(state); state.year = ""; state.rating = ""; state.sort = null; el.q.value = ""; run(); el.q.focus(); });
el.more.addEventListener("click", showMore);
window.addEventListener("popstate", () => { readURL(); el.q.value = state.q; run(); });

readURL();
el.q.value = state.q;
// Narrow screens (900px, as main.css): fold at load unless a filter is set.
if (matchMedia("(max-width: 900px)").matches) {
  el.filters.open = filtering();
}
await run();
if (!state.q) el.q.focus();
