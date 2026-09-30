// Browse lists: each `[data-list]` swaps Hugo's fallback <ul> for sortable,
// filterable, paged cards from the site index. State lives in the URL:
// ?tag=&category=&collection=&year=&month=&rating=&sort=&page= (`q` is search's);
// tag, category and collection also take -not / -match (facets.js); month
// only with year (timeline.js).
//
//   data-scope-kind   section | collection | tag | recent
//   data-scope-value  a path, a collection, a tag, or a limit
//   data-order        default sort (sorts.js)
//   data-per-page     cards per page
//   data-compact      cards only: no controls, pager or URL (dataview)
//   data-limit        compact: the first N only
//
// Filters, then the timeline, go in the page's `[data-list-controls]` right
// column (section.html, term.html), claimed by the first full list, or above
// the list when narrow (layout.js). Sort sits with the count.
import { card, ratingFilter, ratingFilterLabel, UNRATED_FILTER } from "./cards.js";
import * as params from "@params";   // js-params.html
import { addsPages, chipFacets, filterChip, matches, matchToggle, toggleInclude } from "./facets.js";
import { dock } from "./layout.js";
import { siteIndex, scope } from "./site-index.js";
import { SORTS, UNRATED, normaliseSort, parseSort } from "./sorts.js";
import { monthCount, monthFilter, monthOf, renderTimeline, timeline } from "./timeline.js";

const CHIPS = chipFacets(params.chipFacets);

// Each chip facet's values per page and chip order, per facets.js (CHIPS).
// Rating is a minimum and the date the timeline's, both handled in render().
// Disabled categories leave no data, so the facet hides itself.
const byCount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
const FACETS = Object.fromEntries(CHIPS.defs.map((d) => [d.key, { values: (it) => it[d.item] || [], order: byCount }]));

// Filter sections the reader shut (rating, collection, …), for every list in
// this browser. Storage can throw or be empty; then all start open.
const SHUT_KEY = "list-facets-shut";
const shut = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(SHUT_KEY)) || []); } catch { return new Set(); }
})();
function setShut(key, isShut) {
  if (isShut) shut.add(key); else shut.delete(key);
  try { localStorage.setItem(SHUT_KEY, JSON.stringify([...shut])); } catch { /* per page, then */ }
}

// Rating ties: newest first either way.
function sorted(items, sort) {
  const { field, dir } = parseSort(sort);
  const sign = dir === "asc" ? 1 : -1;
  const byTitle = (a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
  const byDate = (f) => (a, b) => (Date.parse(a[f]) || 0) - (Date.parse(b[f]) || 0);
  return [...items].sort(field === "title" ? (a, b) => sign * byTitle(a, b)
    : field === "rating" ? (a, b) => sign * ((a.rating || UNRATED) - (b.rating || UNRATED)) || -byDate("created")(a, b) || byTitle(a, b)
    : (a, b) => sign * byDate(field)(a, b) || byTitle(a, b));
}


// [[value, count], ...] for a facet, in that facet's chip order.
function counts(items, key) {
  const facet = FACETS[key];
  const m = new Map();
  for (const it of items) {
    for (const v of facet.values(it).filter(Boolean)) m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m].sort(facet.order);
}

async function mount(root) {
  const compact = "compact" in root.dataset;
  const perPage = Math.max(1, parseInt(root.dataset.perPage, 10) || 20);
  const limit = parseInt(root.dataset.limit, 10) || undefined;
  const defaultSort = normaliseSort(root.dataset.order);
  // Claimed before the await, so mount order decides.
  const slot = compact ? null : document.querySelector("[data-list-controls]");
  slot?.removeAttribute("data-list-controls");
  let items;
  try {
    items = scope(await siteIndex(), root.dataset.scopeKind, root.dataset.scopeValue);
  } catch (e) {
    if (slot) slot.hidden = true;
    return;   // keep Hugo's plain link list
  }

  // ---- state <-> URL --------------------------------------------------
  // Chip facets by key (CHIPS.read); `more`: keys showing past their limit.
  const state = { sort: defaultSort, ...CHIPS.read(), year: "", month: "", rating: "", page: 1, more: new Set() };
  function readURL() {
    if (compact) return;
    const p = new URLSearchParams(location.search);
    state.sort = normaliseSort(p.get("sort") || defaultSort);
    Object.assign(state, CHIPS.read(p));
    state.year = p.get("year") || "";
    state.month = monthFilter(p.get("month"), state.year);
    state.rating = ratingFilter(p.get("rating"));
    state.page = Math.max(1, parseInt(p.get("page"), 10) || 1);
  }
  function url(overrides = {}) {
    const s = { ...state, ...overrides };
    const p = new URLSearchParams();
    if (s.sort !== defaultSort) p.set("sort", s.sort);
    CHIPS.write(p, s);
    if (s.year) p.set("year", s.year);
    if (s.month) p.set("month", s.month);
    if (s.rating) p.set("rating", s.rating);
    if (s.page > 1) p.set("page", String(s.page));
    const qs = p.toString();
    return location.pathname + (qs ? "?" + qs : "");
  }
  function writeURL(push) {
    if (compact) return;
    const next = url();
    if (next === location.pathname + location.search) return;
    history[push ? "pushState" : "replaceState"](null, "", next);
  }

  // ---- DOM ------------------------------------------------------------------
  root.replaceChildren();
  // Only `body` re-renders, so the fold's open state survives filtering.
  const controls = document.createElement("details");
  controls.className = "list-controls fold";
  controls.open = true;
  controls.innerHTML = `<summary><span class="side-heading">Filters</span></summary>`;
  const body = document.createElement("div");
  body.className = "list-controls-body";
  controls.append(body);
  const status = document.createElement("p");
  status.className = "list-status";
  const sortWrap = document.createElement("label");
  sortWrap.className = "list-sort";
  sortWrap.innerHTML = `<span class="facet-label">Sort</span> <select aria-label="Sort order">${SORTS.map(([v, l]) =>
    `<option value="${v}">${l}</option>`).join("")}</select>`;
  const sortSelect = sortWrap.querySelector("select");
  sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; state.page = 1; render(true); });
  const head = document.createElement("div");
  head.className = "results-head";
  head.append(status, sortWrap);
  const list = document.createElement("ul");
  list.className = "page-list";
  const pager = document.createElement("nav");
  pager.className = "pagination";
  pager.setAttribute("aria-label", "Pagination");
  if (compact) root.append(list);
  else root.append(head, list, pager);
  // Filters and timeline dock as one, so they keep their order when narrow.
  const side = document.createElement("div");
  side.className = "list-side";
  const tl = document.createElement("details");
  tl.className = "timeline fold";
  tl.open = true;
  tl.innerHTML = `<summary><span class="side-heading">Timeline</span></summary>`;
  const tlBody = document.createElement("ol");
  tlBody.className = "tl";
  tl.append(tlBody);

  // A facet shows only when the list varies on it (a tag page hides its own
  // tag). A missing value counts as no value, so a lone category shows unless
  // every page has it. A `shared` facet (collections) shows when there are two
  // or more values — shared ones too, as membership is worth seeing — less a
  // list's own.
  const own = (d) => root.dataset.scopeKind === d.key ? root.dataset.scopeValue : null;
  const chipValues = Object.fromEntries(CHIPS.defs.map((d) => {
    const all = counts(items, d.key);
    const shown = d.shared ? (all.length > 1 ? all : []) : all.filter(([, n]) => n < items.length);
    return [d.key, shown.filter(([n]) => n !== own(d))];
  }));
  // Shows when ratings vary, unrated counting as a value ("★1+" = rated at all).
  const ratings = [...new Set(items.map((it) => it.rating).filter(Boolean))].sort((a, b) => b - a);
  const hasUnrated = items.some((it) => !it.rating);
  const hasRatings = ratings.length > 1 || (ratings.length === 1 && hasUnrated);
  const hasFilters = hasRatings || CHIPS.defs.some((d) => chipValues[d.key].length);
  // Nothing to pick in a single month. Newest year and month open to start,
  // or the ones the URL picked (readURL, below).
  const fullTree = timeline(items);
  const hasTimeline = !compact && monthCount(fullTree) > 1;
  const tlOpen = new Set();

  function chip(d, name, n) {
    return filterChip(state[d.key], name, d.prefix + name, n, () => { state.page = 1; render(true); });
  }

  // A filter section, shut or open on its own (`shut`). `f`: a facets.js
  // facet, for its match toggle; `set`: values picked, shown while shut.
  function facetRow(key, label, chips, f, set) {
    const row = document.createElement("details");
    row.className = "list-facet";
    row.open = !shut.has(key);
    row.addEventListener("toggle", () => setShut(key, !row.open));
    const summary = document.createElement("summary");
    const lab = document.createElement("span");
    lab.className = "facet-label";
    lab.textContent = label;
    if (set) {
      const badge = document.createElement("span");
      badge.className = "facet-badge";
      badge.textContent = set;
      badge.title = `${set} selected`;
      lab.append(" ", badge);
    }
    const toggle = f && matchToggle(f, () => { state.page = 1; render(true); });
    // In a <summary>, a button's click would also shut the section.
    toggle?.addEventListener("click", (e) => e.preventDefault());
    if (toggle) lab.append(" ", toggle);
    summary.append(lab);
    const wrap = document.createElement("div");
    wrap.className = "chip-row";
    wrap.append(...chips);
    row.append(summary, wrap);
    return row;
  }

  // Rating: one at most, "★4+" = that or better. Pressing the set one clears it.
  function ratingChip(value, label, count) {
    const on = state.rating === value;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip filter-chip" + (on ? " active" : "") + (count === 0 && !on ? " empty" : "");
    b.setAttribute("aria-pressed", String(on));
    b.title = on ? "Click to clear" : "Click to show " + label;
    b.append(label);
    const n = document.createElement("span");
    n.className = "count";
    n.textContent = count;
    b.append(n);
    b.addEventListener("click", () => { state.rating = on ? "" : value; state.page = 1; render(true); });
    return b;
  }

  // forRating / forFacet(key): `filtered` minus that filter, so options
  // count what picking them gives.
  function renderControls(filtered, forRating, forFacet) {
    body.replaceChildren();
    // Filters only; sort isn't in this box.
    if (filtering()) {
      const row = document.createElement("div");
      row.className = "list-controls-head";
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "btn-ghost list-reset";
      clear.textContent = "Reset";
      clear.addEventListener("click", () => {
        CHIPS.clear(state); state.year = ""; state.month = ""; state.rating = ""; state.page = 1; render(true);
      });
      row.append(clear);
      body.append(row);
    }

    if (hasRatings) {
      const atLeast = (r) => forRating.filter((it) => (it.rating || 0) >= r).length;
      const chips = ratings.map((r) => ratingChip(String(r), ratingFilterLabel(r), atLeast(r)));
      if (hasUnrated) chips.push(ratingChip(UNRATED_FILTER, "Unrated", forRating.filter((it) => !it.rating).length));
      body.append(facetRow("rating", "Rating", chips, null, state.rating ? 1 : 0));
    }

    // Past a facet's `limit`, chips fold behind "more"; selected ones stay.
    for (const d of CHIPS.defs) {
      const values = chipValues[d.key];
      if (!values.length) continue;
      const f = state[d.key];
      const c = new Map(counts(forFacet(d.key), d.key));
      const open = !d.limit || state.more.has(d.key);
      const visible = open ? values : values.slice(0, d.limit);
      const chips = visible.map(([n]) => chip(d, n, c.get(n) || 0));
      for (const v of d.limit ? [...f.inc, ...f.exc] : []) {
        if (!visible.some(([n]) => n === v)) chips.push(chip(d, v, c.get(v) || 0));
      }
      if (d.limit && values.length > d.limit) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "chip filter-chip more";
        more.textContent = open ? "fewer " + d.label.toLowerCase() : `+${values.length - d.limit} more`;
        more.addEventListener("click", () => {
          if (open) state.more.delete(d.key); else state.more.add(d.key);
          render(false);
        });
        chips.push(more);
      }
      body.append(facetRow(d.key, d.label, chips, f, f.inc.size + f.exc.size));
    }
  }

  function pageLink(n, label, cls, rel) {
    const a = document.createElement("a");
    a.className = ("pager " + cls).trim();
    a.href = url({ page: n });
    if (rel) a.rel = rel;
    a.textContent = label;
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // let new-tab clicks through
      e.preventDefault();
      state.page = n;
      render(true);
      root.scrollIntoView({ block: "start" });
    });
    return a;
  }

  function renderPager(total) {
    pager.replaceChildren();
    if (total < 2) return;
    const cur = state.page;
    const step = (ok, n, label, rel) => ok
      ? pageLink(n, label, "pager-step", rel)
      : Object.assign(document.createElement("span"), { className: "pager pager-step disabled", textContent: label });
    const ol = document.createElement("ol");
    ol.className = "pager-numbers";
    let prev = 0;
    for (let n = 1; n <= total; n++) {
      if (!(n <= 2 || n >= total - 1 || Math.abs(n - cur) <= 2)) continue;
      if (n - prev > 1) ol.insertAdjacentHTML("beforeend", `<li class="pager-gap" aria-hidden="true">…</li>`);
      const li = document.createElement("li");
      if (n === cur) li.innerHTML = `<span class="pager current" aria-current="page">${n}</span>`;
      else li.append(pageLink(n, String(n), ""));
      ol.append(li);
      prev = n;
    }
    pager.append(step(cur > 1, cur - 1, "‹ Previous", "prev"), ol, step(cur < total, cur + 1, "Next ›", "next"));
  }

  const filtering = () => Boolean(CHIPS.anySet(state) || state.year || state.rating);
  const dateLabel = () => state.month ? `${params.months[Number(state.month) - 1]} ${state.year}` : state.year;

  // The other filters narrow it; its own pick shows as pressed, not as a cut.
  let lastForYear = [];
  function drawTimeline(forYear) {
    lastForYear = forYear;
    const tree = timeline(forYear);
    if (!tree.length) {
      tlBody.innerHTML = `<li class="muted tl-empty">No dated pages match.</li>`;
      return;
    }
    renderTimeline(tlBody, tree, {
      year: state.year, month: state.month, open: tlOpen, names: params.months,
      pick: (y, m) => { state.year = y; state.month = m; state.page = 1; render(true); },
      rerender: () => drawTimeline(lastForYear),
    });
  }

  // Each filter as a test; `own` false drops a facet's includes (addsPages).
  const tests = {
    ...Object.fromEntries(CHIPS.keys.map((k) => [k, (it, own) => matches(state[k], FACETS[k].values(it), own)])),
    // Month rides on year, so the timeline counts without both.
    year: (it) => (!state.year || it.year === state.year) && (!state.month || monthOf(it) === state.month),
    rating: (it) => !state.rating
      || (state.rating === UNRATED_FILTER ? !it.rating : (it.rating || 0) >= Number(state.rating)),
  };
  // Passes every test but `skip`'s; a skipped facet keeps its excludes.
  const passes = (it, skip) => Object.entries(tests).every(([k, test]) =>
    k !== skip ? test(it, true) : CHIPS.keys.includes(k) ? test(it, false) : true);

  function render(pushHistory) {
    const filtered = sorted(items.filter((it) => passes(it)), state.sort);
    const total = Math.max(1, Math.ceil(filtered.length / perPage));
    if (state.page > total) state.page = total;
    const slice = compact ? filtered.slice(0, limit) : filtered.slice((state.page - 1) * perPage, state.page * perPage);
    // Card tags filter only while tag is a chip facet that includes; else they link.
    const onTag = compact || !state.tag?.states.includes("include") ? null : (t) => {
      toggleInclude(state.tag, t);
      state.page = 1; render(true);
    };
    list.replaceChildren(...slice.map((it) => card(it, { activeTags: state.tag?.inc, onTag })));
    if (compact) return;
    sortSelect.value = state.sort;

    const forFacet = (k) => addsPages(state[k]) ? items.filter((it) => passes(it, k)) : filtered;
    renderControls(filtered, items.filter((it) => passes(it, "rating")), forFacet);
    if (hasTimeline) drawTimeline(items.filter((it) => passes(it, "year")));
    renderPager(total);
    const n = filtered.length;
    const what = [...CHIPS.describe(state), dateLabel(),
      state.rating && ratingFilterLabel(state.rating)].filter(Boolean).join(" · ");
    const extra = [what, total > 1 && `page ${state.page} of ${total}`].filter(Boolean).join(" · ");
    const detail = document.createElement("span");
    detail.className = "muted";
    detail.textContent = extra ? ` (${extra})` : "";
    status.replaceChildren(
      `${n} page${n === 1 ? "" : "s"}` + (n !== items.length ? ` of ${items.length}` : ""), detail);
    writeURL(pushHistory);
  }

  window.addEventListener("popstate", () => { readURL(); render(false); });
  readURL();
  if (hasTimeline) {
    const y = state.year ? fullTree.find((t) => t.year === state.year) : fullTree[0];
    const m = y && (state.month || (state.year ? "" : y.months[0].month));
    if (y) tlOpen.add(y.year);
    if (m) tlOpen.add(`${y.year}-${m}`);
  }
  // Folded when narrow, unless the URL set a filter (for the timeline, a
  // date). Nothing to filter and no timeline, no box.
  if (!compact && hasFilters) side.append(controls);
  if (hasTimeline) side.append(tl);
  if (side.childElementCount) dock(side, slot, root, (narrow) => {
    controls.open = !narrow || filtering();
    tl.open = !narrow || Boolean(state.year);
  });
  else if (slot) slot.hidden = true;
  render(false);
}

document.querySelectorAll("[data-list]").forEach(mount);
