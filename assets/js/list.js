// Browse lists: every `[data-list]` container takes its pages from the
// site-wide index (fetched once per document, see site-index.js) and renders
// sortable, filterable, paged cards in place of the plain link list Hugo
// rendered as a fallback. Filter, sort and page live in the URL
// (?tag=a&tag=b&type=wiki&year=2024&sort=title&page=2) so views are linkable;
// `q` stays reserved for the search page.
//
// Container attributes:
//   data-scope-kind   which subset of the index (section | tag | bookmarks | recent)
//   data-scope-value  its argument — a path, a tag, or a limit
//   data-order        default sort, "<field>[ asc|desc]" (see sorts.js)
//   data-per-page     cards per page
//   data-compact      cards only: no controls, pager or URL state (home Recent)
import { card, escapeHTML } from "./cards.js";
import { siteIndex, scope } from "./site-index.js";
import { SORTS, normaliseSort, parseSort, sortLabel } from "./sorts.js";

const TAG_CHIPS = 20;   // tag chips shown before "more"

// A page's year: the year of its `created` date, read straight off the RFC 3339
// string rather than via a Date, so it is the year in the page's own offset —
// the same value Hugo hands Pagefind in pagefind-keys.html. Parsing it as a
// local Date instead would let a reader far from the site's zone see a page
// filed one year off what search files it under.
function yearOf(it) {
  return (/^(\d{4})-/.exec(it.created || "") || ["", ""])[1];
}

// The facets a list can offer: the values each page contributes, and the order
// the chips sit in. Tags are multi-select and AND-ed; type and year are
// exclusive, so their state is a string rather than a Set.
const byCount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
const FACETS = {
  type: { values: (it) => [it.type], order: byCount },
  tags: { values: (it) => it.tags || [], order: byCount },
  year: { values: (it) => [yearOf(it)], order: (a, b) => b[0].localeCompare(a[0]) },
};

function sorted(items, sort) {
  const { field, dir } = parseSort(sort);
  const sign = dir === "asc" ? 1 : -1;
  const byTitle = (a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
  return [...items].sort((a, b) => field === "title"
    ? sign * byTitle(a, b)
    : sign * ((Date.parse(a[field]) || 0) - (Date.parse(b[field]) || 0)) || byTitle(a, b));
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
  const state = { sort: defaultSort, type: "", year: "", tags: new Set(), page: 1, moreTags: false };
  function readURL() {
    if (compact) return;
    const p = new URLSearchParams(location.search);
    state.sort = normaliseSort(p.get("sort") || defaultSort);
    state.type = p.get("type") || "";
    state.year = p.get("year") || "";
    state.tags = new Set(p.getAll("tag").filter(Boolean));
    state.page = Math.max(1, parseInt(p.get("page"), 10) || 1);
  }
  function url(overrides = {}) {
    const s = { ...state, ...overrides };
    const p = new URLSearchParams();
    if (s.sort !== defaultSort) p.set("sort", s.sort);
    if (s.type) p.set("type", s.type);
    if (s.year) p.set("year", s.year);
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
  const controls = document.createElement("div");
  controls.className = "list-controls";
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
  // chips, and a tag page hides its own tag.
  const typeFacet = counts(items, "type");
  const hasTypes = typeFacet.length > 1;
  const yearFacet = counts(items, "year");
  const hasYears = yearFacet.length > 1;
  const tagFacet = counts(items, "tags").filter(([, n]) => n < items.length);

  function chip(kind, name, n, active) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip filter-chip" + (active ? " active" : "") + (n === 0 ? " empty" : "");
    b.setAttribute("aria-pressed", String(active));
    b.innerHTML = (kind === "tag" ? "#" : "") + escapeHTML(name) + `<span class="count">${n}</span>`;
    b.addEventListener("click", () => {
      if (kind === "tag") {
        if (state.tags.has(name)) state.tags.delete(name); else state.tags.add(name);
      } else {
        state[kind] = state[kind] === name ? "" : name;   // type, year: exclusive
      }
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

  function renderControls(filtered) {
    controls.replaceChildren();
    const head = document.createElement("div");
    head.className = "list-controls-head";
    const sortWrap = document.createElement("label");
    sortWrap.className = "list-sort";
    sortWrap.innerHTML = `<span class="facet-label">Sort</span> <select aria-label="Sort order">${SORTS.map(([v, l]) =>
      `<option value="${v}"${v === state.sort ? " selected" : ""}>${l}</option>`).join("")}</select>`;
    sortWrap.querySelector("select").addEventListener("change", (e) => {
      state.sort = e.target.value; state.page = 1; render(true);
    });
    head.append(sortWrap);
    if (state.type || state.year || state.tags.size || state.sort !== defaultSort) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "btn-ghost list-reset";
      clear.textContent = "Reset";
      clear.addEventListener("click", () => {
        state.type = ""; state.year = ""; state.tags.clear(); state.sort = defaultSort; state.page = 1; render(true);
      });
      head.append(clear);
    }
    controls.append(head);

    const within = (key) => new Map(counts(filtered, key));
    if (hasTypes) {
      const c = within("type");
      controls.append(facetRow("Type", typeFacet.map(([n]) => chip("type", n, c.get(n) || 0, state.type === n))));
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
      controls.append(facetRow("Tags", chips));
    }
    // Year sits last: the least-reached-for of the three.
    if (hasYears) {
      const c = within("year");
      controls.append(facetRow("Year", yearFacet.map(([n]) => chip("year", n, c.get(n) || 0, state.year === n))));
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

  function render(pushHistory) {
    let filtered = items;
    if (state.type) filtered = filtered.filter((it) => it.type === state.type);
    if (state.year) filtered = filtered.filter((it) => yearOf(it) === state.year);
    for (const t of state.tags) filtered = filtered.filter((it) => (it.tags || []).includes(t));
    filtered = sorted(filtered, state.sort);

    const total = Math.max(1, Math.ceil(filtered.length / perPage));
    if (state.page > total) state.page = total;
    const slice = compact ? filtered : filtered.slice((state.page - 1) * perPage, state.page * perPage);
    const onTag = compact ? null : (t) => {
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      state.page = 1; render(true);
    };
    list.replaceChildren(...slice.map((it) => card(it, { activeTags: state.tags, onTag })));
    if (compact) return;

    renderControls(filtered);
    renderPager(total);
    const n = filtered.length;
    const what = [state.type, ...[...state.tags].map((t) => "#" + t), state.year].filter(Boolean).join(" · ");
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
  render(false);
}

document.querySelectorAll("[data-list]").forEach(mount);
