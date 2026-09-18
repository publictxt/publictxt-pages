// Search page: a custom UI on the Pagefind JS API (its stock UI cannot run
// filter-only searches). Results are drawn with the same card as the browse
// lists (cards.js); the query, type and tags live in the URL.
import { card } from "./cards.js";

const PAGE = 20;
const base = (document.documentElement.dataset.base || "/").replace(/\/?$/, "/");
const $ = (id) => document.getElementById(id);
const el = {
  root: $("search"), q: $("search-q"), clear: $("search-clear"),
  type: $("filter-type"), tag: $("filter-tag"), tagHint: $("filter-tag-hint"),
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
const state = { q: "", type: "", tags: new Set() };
function readURL() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  state.type = p.get("type") || "";
  state.tags = new Set(p.getAll("tag").filter(Boolean));
}
function writeURL() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.type) p.set("type", state.type);
  for (const t of state.tags) p.append("tag", t);
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}
function toggleTag(t) {
  if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
  run();
}

// ---- filter chips -------------------------------------------------------
const allFilters = await pagefind.filters();   // { tag: {name: count}, type: {...} }
const sortedKeys = (obj) => Object.keys(obj || {}).sort((a, b) => (obj[b] - obj[a]) || a.localeCompare(b));

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
    else toggleTag(name);
  });
  return b;
}

function renderFilters(counts) {
  // counts: filter counts within the current result set (or totals when idle)
  el.type.replaceChildren(...sortedKeys(allFilters.type).map((n) =>
    chip("type", n, (counts.type || {})[n] ?? 0, state.type === n)));
  el.tag.replaceChildren(...sortedKeys(allFilters.tag).map((n) =>
    chip("tag", n, (counts.tag || {})[n] ?? 0, state.tags.has(n))));
  el.tagHint.textContent = state.tags.size > 1 ? "— all selected must match" : "";
}

// ---- search ---------------------------------------------------------------
let shown = 0, current = [];
async function run() {
  writeURL();
  const filters = {};
  if (state.type) filters.type = state.type;
  if (state.tags.size) filters.tag = [...state.tags];     // array = AND
  const hasQuery = state.q.trim().length > 0;
  const res = await pagefind.search(hasQuery ? state.q : null, { filters });
  current = res.results; shown = 0;
  el.list.replaceChildren();
  renderFilters(res.filters || allFilters);
  const n = current.length;
  const what = [hasQuery ? `“${state.q}”` : "", state.type, ...[...state.tags].map((t) => "#" + t)].filter(Boolean).join(" · ");
  el.status.textContent = `${n} page${n === 1 ? "" : "s"}` + (what ? ` — ${what}` : "");
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
el.clear.addEventListener("click", () => { state.q = ""; state.type = ""; state.tags.clear(); el.q.value = ""; run(); el.q.focus(); });
el.more.addEventListener("click", showMore);
window.addEventListener("popstate", () => { readURL(); el.q.value = state.q; run(); });

readURL();
el.q.value = state.q;
await run();
if (!state.q) el.q.focus();
