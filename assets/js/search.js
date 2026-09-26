// Search page: custom UI on the Pagefind JS API (the stock UI can't search
// filters alone). Same cards, facets and URL spelling as the browse lists.
//
// Sorting is Pagefind's, on pagefind-keys.html's keys, and replaces relevance
// outright: "Relevance" is offered, and default, only with a query. Rating is
// a minimum: `?rating=4` = any of "4", "5"; `unrated` is its own value.
// Categories OR (`?category=a&category=b`), tags AND.
import { card, ratingFilter, ratingFilterLabel, UNRATED_FILTER } from "./cards.js";
import { SORTS, normaliseSort, parseSort, sortLabel } from "./sorts.js";

const PAGE = 20;
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
const state = { q: "", type: "", categories: new Set(), year: "", rating: "", tags: new Set(), sort: null };
const filtering = () => Boolean(state.type || state.categories.size || state.year || state.rating || state.tags.size);
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
  state.categories = new Set(p.getAll("category").filter(Boolean));
  state.year = p.get("year") || "";
  state.rating = ratingFilter(p.get("rating"));
  state.tags = new Set(p.getAll("tag").filter(Boolean));
  const s = p.get("sort");
  state.sort = !s ? null : s === RELEVANCE ? RELEVANCE : normaliseSort(s);
}
function writeURL() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.type) p.set("type", state.type);
  for (const c of state.categories) p.append("category", c);
  if (state.year) p.set("year", state.year);
  if (state.rating) p.set("rating", state.rating);
  for (const t of state.tags) p.append("tag", t);
  const sort = activeSort();
  if (state.sort && sort !== defaultSort()) p.set("sort", sort);
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}
function toggle(set, v) {
  if (set.has(v)) set.delete(v); else set.add(v);
  run();
}
const toggleTag = (t) => toggle(state.tags, t);

// ---- filter chips -------------------------------------------------------
const allFilters = await pagefind.filters();   // { tag: {name: count}, type: {…}, category: {…}, year: {…}, rating: {…} }
const sortedKeys = (obj) => Object.keys(obj || {}).sort((a, b) => (obj[b] - obj[a]) || a.localeCompare(b));
// Years newest-first, as in the browse lists.
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
    if (kind === "type") { state.type = state.type === name ? "" : name; run(); }
    else toggle(kind === "category" ? state.categories : state.tags, name);
  });
  return b;
}

// counts: filter counts within the current result set (or totals when idle);
// categoryCounts: the same without the category filter, as picking one adds pages.
function renderFilters(counts, categoryCounts) {
  el.type.replaceChildren(...sortedKeys(allFilters.type).map((n) =>
    chip("type", n, (counts.type || {})[n] ?? 0, state.type === n)));
  const categories = sortedKeys(allFilters.category);
  el.categoryGroup.hidden = categories.length === 0;
  el.category.replaceChildren(...categories.map((n) =>
    chip("category", n, (categoryCounts || {})[n] ?? 0, state.categories.has(n))));
  el.categoryHint.textContent = state.categories.size > 1 ? "— any selected may match" : "";
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
  if (state.year) filters.year = state.year;
  if (state.rating === UNRATED_FILTER) filters.rating = UNRATED_FILTER;
  else if (state.rating) filters.rating = { any: ["1", "2", "3", "4", "5"].slice(Number(state.rating) - 1) };
  if (state.tags.size) filters.tag = [...state.tags];     // array = AND
  const sort = activeSort();
  const opts = { filters: state.categories.size ? { ...filters, category: { any: [...state.categories] } } : filters };
  if (sort !== RELEVANCE) { const { field, dir } = parseSort(sort); opts.sort = { [field]: dir }; }
  const query = hasQuery() ? state.q : null;
  // Category counts ignore the category filter: a second search, or the totals
  // when nothing else narrows.
  const [res, anyCategory] = await Promise.all([
    pagefind.search(query, opts),
    state.categories.size && (query || Object.keys(filters).length) ? pagefind.search(query, { filters }) : null,
  ]);
  current = res.results; shown = 0;
  el.list.replaceChildren();
  const counts = res.filters || allFilters;
  const categoryCounts = !state.categories.size ? counts.category
    : anyCategory ? anyCategory.filters?.category : allFilters.category;
  renderFilters(counts, categoryCounts);
  renderSort();
  const n = current.length;
  const what = [hasQuery() ? `“${state.q}”` : "", state.type, [...state.categories].join(" or "), ...[...state.tags].map((t) => "#" + t), state.year,
    state.rating && ratingFilterLabel(state.rating)].filter(Boolean).join(" · ");
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
    rating: Number(d.meta?.rating) || 0,
  };
  return card(item, { activeTags: state.tags, onTag: toggleTag, summaryHTML: d.excerpt || "" });
}

// ---- wiring -------------------------------------------------------------
let timer;
el.q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { state.q = el.q.value; run(); }, 200); });
el.sort.addEventListener("change", () => { state.sort = el.sort.value; run(); });
el.year.addEventListener("change", () => { state.year = el.year.value; run(); });
el.rating.addEventListener("change", () => { state.rating = el.rating.value; run(); });
el.clear.addEventListener("click", () => { state.q = ""; state.type = ""; state.categories.clear(); state.year = ""; state.rating = ""; state.tags.clear(); state.sort = null; el.q.value = ""; run(); el.q.focus(); });
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
