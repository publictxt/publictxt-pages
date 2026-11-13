// Search page: custom UI on the Pagefind JS API (the stock UI can't search
// filters alone). Same cards, facets and URL spelling as the browse lists.
//
// Sorting is Pagefind's, on pagefind-keys.html's keys, and replaces relevance
// outright: "Relevance" is offered, and default, only with a query. Rating is
// a minimum: `?rating=4` = any of "4", "5"; `unrated` is its own value; chips
// count as the lists' do, from a search without the rating filter. The
// timeline (timeline.js, filter mode) picks ?year= / ?month= from Pagefind's
// month counts, recounted without the date filter while one is set.
// Chip facets (CHIPS, from config): include / exclude / any-or-all, as facets.js.
// Results come in batches of #search's data-per-page; "Show more" adds one.
import { card, densityToggle, NO_SOURCE, ratingFilter, ratingFilterLabel, UNRATED_FILTER } from "./cards.js";
import * as params from "@params";   // js-params.html
import { addsPages, chipFacets, filterChip, foldHint, hideByDefault, isSet, matchToggle, pagefindConditions,
  ratingChips, ratingCounts, rememberFold, toggleInclude } from "./facets.js";
import { dock } from "./layout.js";
import { normaliseSort, parseSort, sortsFor } from "./sorts.js";
import { countsTree, monthCount, monthFilter, renderTimeline } from "./timeline.js";

const CHIPS = chipFacets(params.chipFacets);
const COMMUNITY = CHIPS.defs.filter((d) => d.group === "community").map((d) => d.key);   // its own block
const SOURCE = CHIPS.defs.find((d) => d.key === "source");   // for a result card's source chip
const TYPING_MS = 400;   // pause before a keystroke searches; Enter searches now
const base = (document.documentElement.dataset.base || "/").replace(/\/?$/, "/");
const $ = (id) => document.getElementById(id);
const el = {
  root: $("search"), q: $("search-q"), clear: $("search-clear"), filters: $("search-filters"), community: $("search-community"),
  side: $("search-side"), timeline: $("search-timeline"), tl: $("search-tl"), layout: $("search-layout"),
  rating: $("filter-rating"), ratingGroup: $("filter-rating-group"), ratingHint: $("filter-rating-hint"),
  srcRating: $("filter-source-rating"), srcRatingGroup: $("filter-source-rating-group"), srcRatingHint: $("filter-source-rating-hint"),
  sort: $("search-sort"),
  status: $("search-status"), list: $("search-list"), more: $("search-more"),
};
const PAGE = Math.max(1, parseInt(el.root.dataset.perPage, 10) || 20);
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
const state = { q: "", ...CHIPS.read(), year: "", month: "", rating: "", sourceRating: "", sort: null };
// `defaults`: hidden collections excluded (set below, once the index says which exist).
let defaults = CHIPS.read();
const filtering = () => Boolean(!CHIPS.same(state, defaults) || state.year || state.rating || state.sourceRating);
const hasQuery = () => state.q.trim().length > 0;
const defaultSort = () => hasQuery() ? RELEVANCE : "created";
function activeSort() {
  const s = state.sort ?? defaultSort();
  return s === RELEVANCE && !hasQuery() ? "created" : s;
}
function readURL() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  Object.assign(state, CHIPS.readOr(p, defaultChips()));
  state.year = p.get("year") || "";
  state.month = monthFilter(p.get("month"), state.year);
  state.rating = ratingFilter(p.get("rating"));
  state.sourceRating = ratingFilter(p.get("source-rating"));
  const s = p.get("sort");
  state.sort = !s ? null : s === RELEVANCE ? RELEVANCE : normaliseSort(s);
}
function writeURL() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  CHIPS.write(p, state, defaults);
  if (state.year) p.set("year", state.year);
  if (state.month) p.set("month", state.month);
  if (state.rating) p.set("rating", state.rating);
  if (state.sourceRating) p.set("source-rating", state.sourceRating);
  const sort = activeSort();
  if (state.sort && sort !== defaultSort()) p.set("sort", sort);
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}
// Card tags filter only while tag is a chip facet that includes; else they link.
const toggleTag = state.tag?.states.includes("include") ? (t) => { toggleInclude(state.tag, t); run(); } : null;

// ---- filter chips -------------------------------------------------------
const allFilters = await pagefind.filters();   // { tag: {name: count}, collection: {…}, category: {…}, year: {…}, rating: {…} }
// The default chip state, as a list's: params.hiddenCollections the index has, excluded.
const hidden = (params.hiddenCollections || []).filter((h) => h in (allFilters.collection || {}));
const defaultChips = () => hideByDefault(CHIPS.read(), hidden);
defaults = defaultChips();
const sortedKeys = (obj) => Object.keys(obj || {}).sort((a, b) => (obj[b] - obj[a]) || a.localeCompare(b));
// Nothing to pick in a single month. The newest year open to start, or the URL's.
const hasTimeline = monthCount(countsTree(allFilters.month)) > 1;
const tlOpen = new Set();
const dateLabel = () => state.month ? `${params.months[Number(state.month) - 1]} ${state.year}` : state.year;

const more = new Set();   // facets showing past their `limit`
function chip(d, name, count) {
  return filterChip(state[d.key], name, d.prefix + name, count, run);
}

// facetCounts: chip facet counts, per addsPages(); ratingExact / sourceRatingExact: exact
// counts without that filter (a source rating's less NO_SOURCE, this repo's own pages). A chip facet the index lacks hides —
// categories when disabled.
function renderFilters(facetCounts, ratingExact, sourceRatingExact) {
  for (const d of CHIPS.defs) {
    const g = groups[d.key];
    const f = state[d.key];
    const names = sortedKeys(allFilters[d.key]);
    // A facet with a `missing` value (source) always has that one: two to offer a choice.
    g.group.hidden = names.length < (d.missing ? 2 : 1);
    // Past a facet's `limit`, chips fold behind "more", as the lists'; picked ones stay.
    const open = !d.limit || more.has(d.key);
    const visible = open ? names : [...names.slice(0, d.limit),
      ...[...f.inc, ...f.exc].filter((v) => names.indexOf(v) >= d.limit)];
    const chips = visible.map((n) => chip(d, n, (facetCounts[d.key] || {})[n] ?? 0));
    if (d.limit && names.length > d.limit) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip filter-chip more";
      b.textContent = open ? "fewer " + d.label.toLowerCase() : `+${names.length - d.limit} more`;
      b.addEventListener("click", () => {
        if (open) more.delete(d.key); else more.add(d.key);
        renderFilters(facetCounts, ratingExact, sourceRatingExact);
      });
      chips.push(b);
    }
    g.chips.replaceChildren(...chips);
    g.hint.replaceChildren(...foldHint(f.inc.size + f.exc.size, matchToggle(f, run)));
  }
  const ratings = Object.keys(allFilters.rating || {}).filter((r) => r !== UNRATED_FILTER).sort((a, b) => b - a);
  const hasUnrated = UNRATED_FILTER in (allFilters.rating || {});
  el.ratingGroup.hidden = ratings.length === 0;
  el.rating.replaceChildren(...ratingChips([...ratings, ...(hasUnrated ? [UNRATED_FILTER] : [])],
    ratingCounts(ratingExact), state.rating, (v) => { state.rating = v; run(); }));
  el.ratingHint.replaceChildren(...foldHint(state.rating ? 1 : 0));
  // Source rating: as Rating, over forks; shown when their sources' ratings vary.
  const src = Object.keys(allFilters["source-rating"] || {}).filter((r) => r !== NO_SOURCE);
  const srcRatings = src.filter((r) => r !== UNRATED_FILTER).sort((a, b) => b - a);
  const srcUnrated = src.includes(UNRATED_FILTER);
  el.srcRatingGroup.hidden = src.length < 2;
  const { [NO_SOURCE]: _own, ...srcExact } = sourceRatingExact;
  el.srcRating.replaceChildren(...ratingChips([...srcRatings, ...(srcUnrated ? [UNRATED_FILTER] : [])],
    ratingCounts(srcExact), state.sourceRating, (v) => { state.sourceRating = v; run(); }));
  el.srcRatingHint.replaceChildren(...foldHint(state.sourceRating ? 1 : 0));
  // The Community block shows while a facet inside does.
  if (el.community) el.community.hidden = !el.community.querySelector(".list-facet:not([hidden])");
}

// monthCounts: Pagefind's month counts without the date filter, so the
// picked date shows as pressed, not as a cut.
function drawTimeline(monthCounts) {
  const tree = countsTree(monthCounts);
  if (!tree.length) {
    el.tl.innerHTML = `<li class="muted tl-empty">No dated pages match.</li>`;
    return;
  }
  renderTimeline(el.tl, tree, {
    year: state.year, month: state.month, open: tlOpen, names: params.months,
    pick: (y, m) => { state.year = y; state.month = m; run(); },
    rerender: () => drawTimeline(monthCounts),
  });
}

function renderSort() {
  const sorts = sortsFor(Object.keys(allFilters["source-rating"] || {}).some((r) => r !== NO_SOURCE));
  const options = hasQuery() ? [[RELEVANCE, "Relevance"], ...sorts] : sorts;
  const cur = activeSort();
  el.sort.replaceChildren(...options.map(([v, l]) => new Option(l, v, false, v === cur)));
}

// ---- search ---------------------------------------------------------------
// Pagefind filters for the state; `skip` names a facet whose includes are
// left out (its addsPages counts), or "rating" or "date" to leave that out.
function pagefindFilters(skip) {
  const filters = {};
  if (skip !== "date" && state.month) filters.month = `${state.year}-${state.month}`;
  else if (skip !== "date" && state.year) filters.year = state.year;
  if (skip !== "rating" && state.rating) {
    filters.rating = state.rating === UNRATED_FILTER ? UNRATED_FILTER
      : { any: ["1", "2", "3", "4", "5"].slice(Number(state.rating) - 1) };
  }
  if (skip !== "source-rating" && state.sourceRating) {
    filters["source-rating"] = state.sourceRating === UNRATED_FILTER ? UNRATED_FILTER
      : { any: ["1", "2", "3", "4", "5"].slice(Number(state.sourceRating) - 1) };
  }
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
  // An addsPages facet counts from a search without its includes, and a set
  // rating or date from one without it; or the totals when nothing else narrows.
  const recount = [...CHIPS.keys.filter((k) => addsPages(state[k])), ...(state.rating ? ["rating"] : []),
    ...(state.sourceRating ? ["source-rating"] : []),
    ...(hasTimeline && state.year ? ["date"] : [])];
  const without = (k) => {
    const filters = pagefindFilters(k);
    return query || Object.keys(filters).length ? pagefind.search(query, { filters }) : null;
  };
  const [res, ...others] = await Promise.all([pagefind.search(query, opts), ...recount.map(without)]);
  if (id !== runs) return;   // superseded while searching
  current = res.results; shown = 0;
  el.list.replaceChildren();
  const counts = res.filters || allFilters;
  const countsWithout = (k) => { const i = recount.indexOf(k); return i < 0 ? counts : others[i]?.filters || allFilters; };
  const facetCounts = Object.fromEntries(CHIPS.keys.map((k) => [k, countsWithout(k)[k]]));
  renderFilters(facetCounts, countsWithout("rating").rating || {}, countsWithout("source-rating")["source-rating"] || {});
  if (hasTimeline) drawTimeline(countsWithout("date").month);
  renderSort();
  const n = current.length;
  const what = [hasQuery() ? `“${state.q}”` : "", ...CHIPS.describe(state), dateLabel(),
    state.rating && ratingFilterLabel(state.rating),
    state.sourceRating && "source " + ratingFilterLabel(state.sourceRating)].filter(Boolean).join(" · ");
  el.status.textContent = `${n} page${n === 1 ? "" : "s"}` + (what ? ` — ${what}` : "");
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
    createdLabel: d.meta?.created_label || "",
    updatedLabel: d.meta?.updated_label || "",
    arrived: d.meta?.arrived || "",
    rating: Number(d.meta?.rating) || 0,
    source: (d.filters?.source || []).find((s) => s !== SOURCE?.missing) || "",
  };
  return card(item, { activeTags: state.tag?.inc, onTag: toggleTag, summaryHTML: d.excerpt || "", sources: params.sources });
}

// ---- wiring -------------------------------------------------------------
let timer;
const typed = () => { clearTimeout(timer); state.q = el.q.value; run(); };
el.q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(typed, TYPING_MS); });
el.q.addEventListener("keydown", (e) => { if (e.key === "Enter") typed(); });
el.sort.addEventListener("change", () => { state.sort = el.sort.value; run(); });
el.clear.addEventListener("click", () => { state.q = ""; Object.assign(state, defaultChips()); state.year = ""; state.month = ""; state.rating = ""; state.sourceRating = ""; state.sort = null; el.q.value = ""; run(); el.q.focus(); });
el.more.addEventListener("click", showMore);
el.sort.closest(".results-tools").append(densityToggle(el.list));
window.addEventListener("popstate", () => { readURL(); el.q.value = state.q; run(); });

for (const g of document.querySelectorAll("#search-side [data-facet]")) rememberFold(g, g.dataset.facet);
readURL();
el.q.value = state.q;
if (hasTimeline) {
  tlOpen.add(state.year || countsTree(allFilters.month)[0].year);
  el.timeline.hidden = false;
}
// The right column; above the results when narrow, each folded unless it has
// a filter set.
el.side.hidden = false;
dock(el.side, el.side.closest(".aside"), el.layout, (narrow) => {
  el.filters.open = !narrow || filtering();
  if (el.community) el.community.open = !narrow || Boolean(state.sourceRating) || COMMUNITY.some((k) => isSet(state[k]));
  el.timeline.open = !narrow || Boolean(state.year);
});
await run();
if (!state.q) el.q.focus();
