// Browse lists: each `[data-list]` swaps Hugo's fallback <ul> for sortable,
// filterable, paged cards from the site index. State lives in the URL:
// ?tag=&category=&type=&year=&rating=&sort=&page= (`q` is search's); tag and
// category also take -not / -match (facets.js).
//
//   data-scope-kind   section | tag | bookmarks | recent
//   data-scope-value  a path, a tag, or a limit
//   data-order        default sort (sorts.js)
//   data-per-page     cards per page
//   data-compact      cards only: no controls, pager or URL (home Recent)
import { card, ratingFilter, ratingFilterLabel, UNRATED_FILTER } from "./cards.js";
import { addsPages, chipState, clearFacet, cycle, describe, emptyFacet, filterChip, isSet, matches, matchToggle,
  readFacet, toggleInclude, writeFacet } from "./facets.js";
import { siteIndex, scope } from "./site-index.js";
import { SORTS, UNRATED, normaliseSort, parseSort, sortLabel } from "./sorts.js";

const TAG_CHIPS = 20;   // tag chips shown before "more"

// Sliced, not parsed as a local Date, to match Hugo's year (traps.md).
function yearOf(it) {
  return (/^(\d{4})-/.exec(it.created || "") || ["", ""])[1];
}

// Each facet's values per page and chip order. Tags and categories per
// facets.js; the rest single-select.
// Rating is a minimum, handled in render(). Disabled categories leave no data,
// so the facet hides itself.
const byCount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
const FACETS = {
  type: { values: (it) => [it.type], order: byCount },
  category: { values: (it) => it.categories || [], order: byCount },
  tags: { values: (it) => it.tags || [], order: byCount },
  year: { values: (it) => [yearOf(it)], order: (a, b) => b[0].localeCompare(a[0]) },
};

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
  const defaultSort = normaliseSort(root.dataset.order);
  let items;
  try {
    items = scope(await siteIndex(), root.dataset.scopeKind, root.dataset.scopeValue);
  } catch (e) {
    return;   // keep Hugo's plain link list
  }

  // ---- state <-> URL --------------------------------------------------
  const state = { sort: defaultSort, type: "", category: emptyFacet("category"), year: "", rating: "", tag: emptyFacet("tag"), page: 1, moreTags: false };
  function readURL() {
    if (compact) return;
    const p = new URLSearchParams(location.search);
    state.sort = normaliseSort(p.get("sort") || defaultSort);
    state.type = p.get("type") || "";
    state.category = readFacet(p, "category");
    state.year = p.get("year") || "";
    state.rating = ratingFilter(p.get("rating"));
    state.tag = readFacet(p, "tag");
    state.page = Math.max(1, parseInt(p.get("page"), 10) || 1);
  }
  function url(overrides = {}) {
    const s = { ...state, ...overrides };
    const p = new URLSearchParams();
    if (s.sort !== defaultSort) p.set("sort", s.sort);
    if (s.type) p.set("type", s.type);
    writeFacet(p, s.category);
    if (s.year) p.set("year", s.year);
    if (s.rating) p.set("rating", s.rating);
    writeFacet(p, s.tag);
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
  controls.innerHTML = `<summary><span class="side-heading">Sort &amp; filter</span></summary>`;
  const body = document.createElement("div");
  body.className = "list-controls-body";
  controls.append(body);
  const status = document.createElement("p");
  status.className = "list-status muted";
  const list = document.createElement("ul");
  list.className = "page-list";
  const pager = document.createElement("nav");
  pager.className = "pagination";
  pager.setAttribute("aria-label", "Pagination");
  if (compact) root.append(list);
  else root.append(controls, status, list, pager);

  // A facet shows only when the list varies on it (a tag page hides its own
  // tag). Tags and category count a missing value as no value, so a lone
  // category shows unless every page has it.
  const typeFacet = counts(items, "type");
  const hasTypes = typeFacet.length > 1;
  const yearFacet = counts(items, "year");
  const hasYears = yearFacet.length > 1;
  const tagFacet = counts(items, "tags").filter(([, n]) => n < items.length);
  const categoryFacet = counts(items, "category").filter(([, n]) => n < items.length);
  // Shows when ratings vary, unrated counting as a value ("★1+" = rated at all).
  const ratings = [...new Set(items.map((it) => it.rating).filter(Boolean))].sort((a, b) => b - a);
  const hasUnrated = items.some((it) => !it.rating);
  const hasRatings = ratings.length > 1 || (ratings.length === 1 && hasUnrated);

  function chip(kind, name, n) {
    const onClick = () => {
      if (kind === "type") state.type = state.type === name ? "" : name;
      else cycle(state[kind], name);
      state.page = 1;
      render(true);
    };
    return kind === "type" ? filterChip(name, n, state.type === name ? "include" : "", onClick)
      : filterChip((kind === "tag" ? "#" : "") + name, n, chipState(state[kind], name), onClick, true);
  }

  // `f`: a facets.js facet, for its match toggle.
  function facetRow(label, chips, f) {
    const row = document.createElement("div");
    row.className = "list-facet";
    const lab = document.createElement("span");
    lab.className = "facet-label";
    lab.textContent = label;
    const toggle = f && matchToggle(f, () => { state.page = 1; render(true); });
    if (toggle) lab.append(" ", toggle);
    const wrap = document.createElement("div");
    wrap.className = "chip-row";
    wrap.append(...chips);
    row.append(lab, wrap);
    return row;
  }

  // forYear / forRating / forFacet(key): `filtered` minus that filter, so
  // options count what picking them gives.
  function renderControls(filtered, forYear, forRating, forFacet) {
    body.replaceChildren();
    const head = document.createElement("div");
    head.className = "list-controls-head";
    const selects = document.createElement("div");
    selects.className = "list-selects";
    const sortWrap = document.createElement("label");
    sortWrap.className = "list-sort";
    sortWrap.innerHTML = `<span class="facet-label">Sort</span> <select aria-label="Sort order">${SORTS.map(([v, l]) =>
      `<option value="${v}"${v === state.sort ? " selected" : ""}>${l}</option>`).join("")}</select>`;
    sortWrap.querySelector("select").addEventListener("change", (e) => {
      state.sort = e.target.value; state.page = 1; render(true);
    });
    selects.append(sortWrap);

    // A select: least used, and scales.
    if (hasYears) {
      const c = new Map(counts(forYear, "year"));
      const yearWrap = document.createElement("label");
      yearWrap.className = "list-sort";
      yearWrap.innerHTML = `<span class="facet-label">Year</span> <select aria-label="Filter by year">`
        + `<option value=""${state.year ? "" : " selected"}>All years</option>`
        + yearFacet.map(([y]) => `<option value="${y}"${y === state.year ? " selected" : ""}>${y} (${c.get(y) || 0})</option>`).join("")
        + `</select>`;
      yearWrap.querySelector("select").addEventListener("change", (e) => {
        state.year = e.target.value; state.page = 1; render(true);
      });
      selects.append(yearWrap);
    }
    if (hasRatings) {
      const atLeast = (r) => forRating.filter((it) => (it.rating || 0) >= r).length;
      const unrated = forRating.filter((it) => !it.rating).length;
      const ratingWrap = document.createElement("label");
      ratingWrap.className = "list-sort";
      ratingWrap.innerHTML = `<span class="facet-label">Rating</span> <select aria-label="Filter by minimum rating">`
        + `<option value=""${state.rating ? "" : " selected"}>Any rating</option>`
        + ratings.map((r) => `<option value="${r}"${String(r) === state.rating ? " selected" : ""}>${ratingFilterLabel(r)} (${atLeast(r)})</option>`).join("")
        + (hasUnrated ? `<option value="${UNRATED_FILTER}"${state.rating === UNRATED_FILTER ? " selected" : ""}>Unrated (${unrated})</option>` : "")
        + `</select>`;
      ratingWrap.querySelector("select").addEventListener("change", (e) => {
        state.rating = e.target.value; state.page = 1; render(true);
      });
      selects.append(ratingWrap);
    }
    head.append(selects);
    if (filtering() || state.sort !== defaultSort) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "btn-ghost list-reset";
      clear.textContent = "Reset";
      clear.addEventListener("click", () => {
        state.type = ""; clearFacet(state.category); state.year = ""; state.rating = ""; clearFacet(state.tag); state.sort = defaultSort; state.page = 1; render(true);
      });
      head.append(clear);
    }
    body.append(head);

    if (hasTypes) {
      const c = new Map(counts(filtered, "type"));
      body.append(facetRow("Type", typeFacet.map(([n]) => chip("type", n, c.get(n) || 0))));
    }
    if (categoryFacet.length) {
      const c = new Map(counts(forFacet("category"), "category"));
      body.append(facetRow("Category", categoryFacet.map(([n]) => chip("category", n, c.get(n) || 0)), state.category));
    }
    if (tagFacet.length) {
      const c = new Map(counts(forFacet("tag"), "tags"));
      const visible = state.moreTags ? tagFacet : tagFacet.slice(0, TAG_CHIPS);
      const chips = visible.map(([n]) => chip("tag", n, c.get(n) || 0));
      for (const t of [...state.tag.inc, ...state.tag.exc]) {
        if (!visible.some(([n]) => n === t)) chips.push(chip("tag", t, c.get(t) || 0));
      }
      if (tagFacet.length > TAG_CHIPS) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "chip filter-chip more";
        more.textContent = state.moreTags ? "fewer tags" : `+${tagFacet.length - TAG_CHIPS} more`;
        more.addEventListener("click", () => { state.moreTags = !state.moreTags; render(false); });
        chips.push(more);
      }
      body.append(facetRow("Tags", chips, state.tag));
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

  const filtering = () => Boolean(state.type || isSet(state.category) || state.year || state.rating || isSet(state.tag));

  // Each filter as a test; `own` false drops a facet's includes (addsPages).
  const tests = {
    type: (it) => !state.type || it.type === state.type,
    year: (it) => !state.year || yearOf(it) === state.year,
    rating: (it) => !state.rating
      || (state.rating === UNRATED_FILTER ? !it.rating : (it.rating || 0) >= Number(state.rating)),
    tag: (it, own) => matches(state.tag, it.tags || [], own),
    category: (it, own) => matches(state.category, it.categories || [], own),
  };
  // Passes every test but `skip`'s; a skipped facet keeps its excludes.
  const passes = (it, skip) => Object.entries(tests).every(([k, test]) =>
    k !== skip ? test(it, true) : k === "tag" || k === "category" ? test(it, false) : true);

  function render(pushHistory) {
    const filtered = sorted(items.filter((it) => passes(it)), state.sort);
    const total = Math.max(1, Math.ceil(filtered.length / perPage));
    if (state.page > total) state.page = total;
    const slice = compact ? filtered : filtered.slice((state.page - 1) * perPage, state.page * perPage);
    const onTag = compact ? null : (t) => {
      toggleInclude(state.tag, t);
      state.page = 1; render(true);
    };
    list.replaceChildren(...slice.map((it) => card(it, { activeTags: state.tag.inc, onTag })));
    if (compact) return;

    const forFacet = (k) => addsPages(state[k]) ? items.filter((it) => passes(it, k)) : filtered;
    renderControls(filtered, items.filter((it) => passes(it, "year")), items.filter((it) => passes(it, "rating")), forFacet);
    renderPager(total);
    const n = filtered.length;
    const what = [state.type, ...describe(state.category), ...describe(state.tag, "#"), state.year,
      state.rating && ratingFilterLabel(state.rating)].filter(Boolean).join(" · ");
    const label = sortLabel(state.sort);
    status.textContent = `${n} page${n === 1 ? "" : "s"}`
      + (n !== items.length ? ` of ${items.length}` : "")
      + (what ? ` — ${what}` : "")
      + ` · ${label}`
      + (total > 1 ? ` · page ${state.page} of ${total}` : "");
    writeURL(pushHistory);
  }

  window.addEventListener("popstate", () => { readURL(); render(false); });
  readURL();
  // Narrow screens (900px, as main.css): fold unless the URL set a filter or sort.
  if (matchMedia("(max-width: 900px)").matches) {
    controls.open = filtering() || state.sort !== defaultSort;
  }
  render(false);
}

document.querySelectorAll("[data-list]").forEach(mount);
