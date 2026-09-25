// Browse lists: every `[data-list]` container takes its pages from the
// site-wide index (fetched once per document, see site-index.js) and renders
// sortable, filterable, paged cards in place of the plain link list Hugo
// rendered as a fallback. Filter, sort and page live in the URL
// (?tag=a&tag=b&type=wiki&category=essay&year=2024&rating=4&sort=title&page=2) so views are linkable;
// `q` stays reserved for the search page.
//
// Container attributes:
//   data-scope-kind   which subset of the index (section | tag | bookmarks | recent)
//   data-scope-value  its argument — a path, a tag, or a limit
//   data-order        default sort, "<field>[ asc|desc]" (see sorts.js)
//   data-per-page     cards per page
//   data-compact      cards only: no controls, pager or URL state (home Recent)
import { card, escapeHTML, minRatingLabel } from "./cards.js";
import { siteIndex, scope } from "./site-index.js";
import { SORTS, normaliseSort, parseSort, sortLabel } from "./sorts.js";

const TAG_CHIPS = 20;   // tag chips shown before "more"

// A page's `created` year, sliced off the RFC 3339 string rather than parsed as a
// local Date, so it matches the year Hugo gives Pagefind (see docs/wiki/traps.md).
function yearOf(it) {
  return (/^(\d{4})-/.exec(it.created || "") || ["", ""])[1];
}

// The facets a list offers: each page's values, and the order they display in.
// Tags are AND-ed; type, category and year are exclusive, so their state is a
// string. Rating is a minimum, not a facet value, and is handled in render(). Category is absent from the index when categories are disabled, which
// leaves its facet empty and hidden — list.js needs no toggle of its own.
const byCount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
const FACETS = {
  type: { values: (it) => [it.type], order: byCount },
  category: { values: (it) => [it.category], order: byCount },
  tags: { values: (it) => it.tags || [], order: byCount },
  year: { values: (it) => [yearOf(it)], order: (a, b) => b[0].localeCompare(a[0]) },
};

// Rating ties fall back to newest; unrated pages count as 0, so sort last.
function sorted(items, sort) {
  const { field, dir } = parseSort(sort);
  const sign = dir === "asc" ? 1 : -1;
  const byTitle = (a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
  const byDate = (f) => (a, b) => (Date.parse(a[f]) || 0) - (Date.parse(b[f]) || 0);
  return [...items].sort(field === "title" ? (a, b) => sign * byTitle(a, b)
    : field === "rating" ? (a, b) => sign * ((a.rating || 0) - (b.rating || 0) || byDate("created")(a, b)) || byTitle(a, b)
    : (a, b) => sign * byDate(field)(a, b) || byTitle(a, b));
}

// `?rating=N` means N or better; anything but 1–5 reads as no filter.
const minRating = (v) => (/^[1-5]$/.test(v || "") ? v : "");

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
  const state = { sort: defaultSort, type: "", category: "", year: "", rating: "", tags: new Set(), page: 1, moreTags: false };
  function readURL() {
    if (compact) return;
    const p = new URLSearchParams(location.search);
    state.sort = normaliseSort(p.get("sort") || defaultSort);
    state.type = p.get("type") || "";
    state.category = p.get("category") || "";
    state.year = p.get("year") || "";
    state.rating = minRating(p.get("rating"));
    state.tags = new Set(p.getAll("tag").filter(Boolean));
    state.page = Math.max(1, parseInt(p.get("page"), 10) || 1);
  }
  function url(overrides = {}) {
    const s = { ...state, ...overrides };
    const p = new URLSearchParams();
    if (s.sort !== defaultSort) p.set("sort", s.sort);
    if (s.type) p.set("type", s.type);
    if (s.category) p.set("category", s.category);
    if (s.year) p.set("year", s.year);
    if (s.rating) p.set("rating", s.rating);
    for (const t of s.tags) p.append("tag", t);
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
  // A <details> so the controls fold away; only `body` is re-rendered, so the
  // reader's open/closed choice survives every filter click.
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

  // Chips for a facet are only useful when the list actually varies on it:
  // a section of one type gets no type chips, one year of posts gets no year
  // chips, and a tag page hides its own tag. Category, like tags, shows when
  // only some pages have one: "uncategorised" is not a value, so a lone
  // category still narrows the list — unless every page carries it.
  const typeFacet = counts(items, "type");
  const hasTypes = typeFacet.length > 1;
  const yearFacet = counts(items, "year");
  const hasYears = yearFacet.length > 1;
  const tagFacet = counts(items, "tags").filter(([, n]) => n < items.length);
  const categoryFacet = counts(items, "category").filter(([, n]) => n < items.length);
  // Ratings present, best first. The select shows when some page differs from
  // the rest, unrated counting as a value: "★1+" then means "rated at all".
  const ratings = [...new Set(items.map((it) => it.rating).filter(Boolean))].sort((a, b) => b - a);
  const hasRatings = ratings.length > 1 || (ratings.length === 1 && items.some((it) => !it.rating));

  function chip(kind, name, n, active) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip filter-chip" + (active ? " active" : "") + (n === 0 ? " empty" : "");
    b.setAttribute("aria-pressed", String(active));
    b.innerHTML = (kind === "tag" ? "#" : "") + escapeHTML(name) + `<span class="count">${n}</span>`;
    b.addEventListener("click", () => {
      if (kind === "type" || kind === "category") state[kind] = state[kind] === name ? "" : name;
      else if (state.tags.has(name)) state.tags.delete(name);
      else state.tags.add(name);
      state.page = 1;
      render(true);
    });
    return b;
  }

  function facetRow(label, chips) {
    const row = document.createElement("div");
    row.className = "list-facet";
    const lab = document.createElement("span");
    lab.className = "facet-label";
    lab.textContent = label;
    const wrap = document.createElement("div");
    wrap.className = "chip-row";
    wrap.append(...chips);
    row.append(lab, wrap);
    return row;
  }

  // `forYear` / `forRating` are `filtered` minus that one filter: a single-select
  // option must count what picking it gives, not what the current choice leaves.
  function renderControls(filtered, forYear, forRating) {
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

    // A select, not a chip row: the least-reached-for facet, and it scales.
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
      const ratingWrap = document.createElement("label");
      ratingWrap.className = "list-sort";
      ratingWrap.innerHTML = `<span class="facet-label">Rating</span> <select aria-label="Filter by minimum rating">`
        + `<option value=""${state.rating ? "" : " selected"}>Any rating</option>`
        + ratings.map((r) => `<option value="${r}"${String(r) === state.rating ? " selected" : ""}>${minRatingLabel(r)} (${atLeast(r)})</option>`).join("")
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
        state.type = ""; state.category = ""; state.year = ""; state.rating = ""; state.tags.clear(); state.sort = defaultSort; state.page = 1; render(true);
      });
      head.append(clear);
    }
    body.append(head);

    const within = (key) => new Map(counts(filtered, key));
    if (hasTypes) {
      const c = within("type");
      body.append(facetRow("Type", typeFacet.map(([n]) => chip("type", n, c.get(n) || 0, state.type === n))));
    }
    if (categoryFacet.length) {
      const c = within("category");
      body.append(facetRow("Category", categoryFacet.map(([n]) => chip("category", n, c.get(n) || 0, state.category === n))));
    }
    if (tagFacet.length) {
      const c = within("tags");
      const visible = state.moreTags ? tagFacet : tagFacet.slice(0, TAG_CHIPS);
      const chips = visible.map(([n]) => chip("tag", n, c.get(n) || 0, state.tags.has(n)));
      for (const t of state.tags) {
        if (!visible.some(([n]) => n === t)) chips.push(chip("tag", t, c.get(t) || 0, true));
      }
      if (tagFacet.length > TAG_CHIPS) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "chip filter-chip more";
        more.textContent = state.moreTags ? "fewer tags" : `+${tagFacet.length - TAG_CHIPS} more`;
        more.addEventListener("click", () => { state.moreTags = !state.moreTags; render(false); });
        chips.push(more);
      }
      body.append(facetRow("Tags", chips));
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

  const filtering = () => Boolean(state.type || state.category || state.year || state.rating || state.tags.size);

  function render(pushHistory) {
    let base = items;
    if (state.type) base = base.filter((it) => it.type === state.type);
    if (state.category) base = base.filter((it) => it.category === state.category);
    for (const t of state.tags) base = base.filter((it) => (it.tags || []).includes(t));
    const byYear = (it) => !state.year || yearOf(it) === state.year;
    const byRating = (it) => !state.rating || (it.rating || 0) >= Number(state.rating);
    const forYear = base.filter(byRating);
    const forRating = base.filter(byYear);
    const filtered = sorted(forYear.filter(byYear), state.sort);

    const total = Math.max(1, Math.ceil(filtered.length / perPage));
    if (state.page > total) state.page = total;
    const slice = compact ? filtered : filtered.slice((state.page - 1) * perPage, state.page * perPage);
    const onTag = compact ? null : (t) => {
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      state.page = 1; render(true);
    };
    list.replaceChildren(...slice.map((it) => card(it, { activeTags: state.tags, onTag })));
    if (compact) return;

    renderControls(filtered, forYear, forRating);
    renderPager(total);
    const n = filtered.length;
    const what = [state.type, state.category, ...[...state.tags].map((t) => "#" + t), state.year,
      state.rating && minRatingLabel(Number(state.rating))].filter(Boolean).join(" · ");
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
  // Below the stacking breakpoint (main.css, 900px), as on the search page:
  // start folded unless the URL brought a filter or sort, so cards show first.
  if (matchMedia("(max-width: 900px)").matches) {
    controls.open = filtering() || state.sort !== defaultSort;
  }
  render(false);
}

document.querySelectorAll("[data-list]").forEach(mount);
