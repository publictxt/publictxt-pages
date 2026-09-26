// Search page: custom UI on the Pagefind JS API (the stock UI can't search
// filters alone). Same cards, facets and URL spelling as the browse lists.
//
// Sorting is Pagefind's, on pagefind-keys.html's keys, and replaces relevance
// outright: "Relevance" is offered, and default, only with a query. Rating is
// a minimum: `?rating=4` = any of "4", "5"; `unrated` is its own value.
// Tags and categories: include / exclude / any-or-all, as facets.js.
import { card, ratingFilter, ratingFilterLabel, UNRATED_FILTER } from "./cards.js";
import { addsPages, chipState, clearFacet, cycle, describe, emptyFacet, filterChip, isSet, matchToggle,
  pagefindConditions, readFacet, toggleInclude, writeFacet } from "./facets.js";
import { SORTS, normaliseSort, parseSort, sortLabel } from "./sorts.js";

const PAGE = 20;
const TYPING_MS = 400;   // pause before a keystroke searches; Enter searches now
const MULTI = ["tag", "category"];
const base = (document.documentElement.dataset.base || "/").replace(/\/?$/, "/");
const $ = (id) => document.getElementById(id);
const el = {
  root: $("search"), q: $("search-q"), clear: $("search-clear"), filters: $("search-filters"),
  type: $("filter-type"), category: $("filter-category"), categoryGroup: $("filter-category-group"),
  categoryHint: $("filter-category-hint"),
  year: $("filter-year"), yearGroup: $("filter-year-group"),
  rating: $("filter-rating"), ratingGroup: $("filter-rating-group"),
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
// `sort` null = not chosen, so the default follows the query.
const RELEVANCE = "relevance";
const state = { q: "", type: "", category: emptyFacet("category"), year: "", rating: "", tag: emptyFacet("tag"), sort: null };
const filtering = () => Boolean(state.type || isSet(state.category) || state.year || state.rating || isSet(state.tag));
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
  state.category = readFacet(p, "category");
  state.year = p.get("year") || "";
  state.rating = ratingFilter(p.get("rating"));
  state.tag = readFacet(p, "tag");
  const s = p.get("sort");
  state.sort = !s ? null : s === RELEVANCE ? RELEVANCE : normaliseSort(s);
}
function writeURL() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.type) p.set("type", state.type);
  writeFacet(p, state.category);
  if (state.year) p.set("year", state.year);
  if (state.rating) p.set("rating", state.rating);
  writeFacet(p, state.tag);
  const sort = activeSort();
  if (state.sort && sort !== defaultSort()) p.set("sort", sort);
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}
const toggleTag = (t) => { toggleInclude(state.tag, t); run(); };

// ---- filter chips -------------------------------------------------------
const allFilters = await pagefind.filters();   // { tag: {name: count}, type: {…}, category: {…}, year: {…}, rating: {…} }
const sortedKeys = (obj) => Object.keys(obj || {}).sort((a, b) => (obj[b] - obj[a]) || a.localeCompare(b));
// Years newest-first, as in the browse lists.
const yearKeys = (obj) => Object.keys(obj || {}).sort((a, b) => b.localeCompare(a));

function chip(kind, name, count) {
  if (kind === "type") {
    return filterChip(name, count, state.type === name ? "include" : "", () => { state.type = state.type === name ? "" : name; run(); });
  }
  const f = state[kind];
  return filterChip((kind === "tag" ? "#" : "") + name, count, chipState(f, name), () => { cycle(f, name); run(); }, true);
}

// counts: filter counts within the current result set (or totals when idle);
// facetCounts: tag / category counts, per addsPages().
function renderFilters(counts, facetCounts) {
  el.type.replaceChildren(...sortedKeys(allFilters.type).map((n) =>
    chip("type", n, (counts.type || {})[n] ?? 0)));
  const categories = sortedKeys(allFilters.category);
  el.categoryGroup.hidden = categories.length === 0;
  el.category.replaceChildren(...categories.map((n) =>
    chip("category", n, (facetCounts.category || {})[n] ?? 0)));
  el.categoryHint.replaceChildren(...[matchToggle(state.category, run)].filter(Boolean));
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
  el.tag.replaceChildren(...sortedKeys(allFilters.tag).map((n) =>
    chip("tag", n, (facetCounts.tag || {})[n] ?? 0)));
  el.tagHint.replaceChildren(...[matchToggle(state.tag, run)].filter(Boolean));
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
  if (state.type) filters.type = state.type;
  if (state.year) filters.year = state.year;
  if (state.rating === UNRATED_FILTER) filters.rating = UNRATED_FILTER;
  else if (state.rating) filters.rating = { any: ["1", "2", "3", "4", "5"].slice(Number(state.rating) - 1) };
  const all = MULTI.flatMap((k) => pagefindConditions(state[k], k !== skip));
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
  const recount = MULTI.filter((k) => addsPages(state[k]));
  const without = (k) => {
    const filters = pagefindFilters(k);
    return query || Object.keys(filters).length ? pagefind.search(query, { filters }) : null;
  };
  const [res, ...others] = await Promise.all([pagefind.search(query, opts), ...recount.map(without)]);
  if (id !== runs) return;   // superseded while searching
  current = res.results; shown = 0;
  el.list.replaceChildren();
  const counts = res.filters || allFilters;
  const facetCounts = Object.fromEntries(MULTI.map((k) => {
    const i = recount.indexOf(k);
    return [k, i < 0 ? counts[k] : (others[i]?.filters || allFilters)[k]];
  }));
  renderFilters(counts, facetCounts);
  renderSort();
  const n = current.length;
  const what = [hasQuery() ? `“${state.q}”` : "", state.type, ...describe(state.category), ...describe(state.tag, "#"), state.year,
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
    type: (d.filters?.type || [])[0] || "",
    tags: d.filters?.tag || [],
    created: d.meta?.created || "",
    updated: d.meta?.updated || "",
    rating: Number(d.meta?.rating) || 0,
  };
  return card(item, { activeTags: state.tag.inc, onTag: toggleTag, summaryHTML: d.excerpt || "" });
}

// ---- wiring -------------------------------------------------------------
let timer;
const typed = () => { clearTimeout(timer); state.q = el.q.value; run(); };
el.q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(typed, TYPING_MS); });
el.q.addEventListener("keydown", (e) => { if (e.key === "Enter") typed(); });
el.sort.addEventListener("change", () => { state.sort = el.sort.value; run(); });
el.year.addEventListener("change", () => { state.year = el.year.value; run(); });
el.rating.addEventListener("change", () => { state.rating = el.rating.value; run(); });
el.clear.addEventListener("click", () => { state.q = ""; state.type = ""; clearFacet(state.category); state.year = ""; state.rating = ""; clearFacet(state.tag); state.sort = null; el.q.value = ""; run(); el.q.focus(); });
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
