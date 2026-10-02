// The one page card, for list.js and search.js. Item shape = index.json's
// (list-json.html): { url, title, collections[], section, tags[], categories[],
// created, updated, year, createdLabel, updatedLabel, summary,
// bookmarks[{url, label}], rating }. Display values come from Hugo; JS never
// formats a date or a label.

export function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// As page-date.html; the labels and the "updated" rule are date-labels.html's.
export function dateHTML(item) {
  if (!item.createdLabel) return "";
  let html = `<time class="muted" datetime="${escapeHTML(item.created)}">${escapeHTML(item.createdLabel)}</time>`;
  if (item.updatedLabel) {
    html += ` <span class="muted">· updated <time datetime="${escapeHTML(item.updated)}">${escapeHTML(item.updatedLabel)}</time></span>`;
  }
  return html;
}

// Same stars as page-meta.html. `rating` is 1–5, absent when unrated.
export function ratingHTML(item) {
  const r = item.rating;
  return r ? ` <span class="rating" role="img" aria-label="Rated ${r} of 5">${"★".repeat(r)}${"☆".repeat(5 - r)}</span>` : "";
}

// `?rating=`: "1"–"5" = that or better, "unrated", else no filter.
export const UNRATED_FILTER = "unrated";
export function ratingFilter(v) {
  return /^[1-5]$/.test(v || "") || v === UNRATED_FILTER ? v : "";
}

// A rating filter value as the lists and search show it: "★4+", "★5", "Unrated".
export function ratingFilterLabel(v) {
  return v === UNRATED_FILTER ? "Unrated" : `★${v}${Number(v) < 5 ? "+" : ""}`;
}

// <base>/tags/<term>/, base from <html data-base> for sub-path deploys.
export function tagURL(name) {
  const base = document.documentElement.dataset.base || "/";
  return base.replace(/\/?$/, "/") + "tags/" + encodeURIComponent(name.toLowerCase()) + "/";
}

// Compact cards (main.css .dense): one line each — title, date, rating — no
// summary, links or tags. A reading preference, so remembered per browser
// and left out of the URL. Storage can throw or be empty; then cards start full.
const DENSE_KEY = "cards-dense";
export function readDense(storage) {
  try { return storage.getItem(DENSE_KEY) === "1"; } catch { return false; }
}

// The toggle for `list` (a .page-list or .result-list), set as remembered.
export function densityToggle(list) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn-ghost density-toggle";
  b.textContent = "Compact";
  const set = (on) => { list.classList.toggle("dense", on); b.setAttribute("aria-pressed", String(on)); };
  set(readDense(globalThis.localStorage));
  b.addEventListener("click", () => {
    const on = !list.classList.contains("dense");
    set(on);
    try { localStorage.setItem(DENSE_KEY, on ? "1" : "0"); } catch { /* this page only, then */ }
  });
  return b;
}

/**
 * A page card. Options:
 *   activeTags   a Set of tag names to mark as selected
 *   onTag(name)  when given, tag chips are filter buttons instead of links
 *   summaryHTML  pre-rendered HTML (a search excerpt with <mark>) in place of item.summary
 */
export function card(item, opts = {}) {
  const li = document.createElement("li");
  li.className = "page-card";
  const tags = item.tags || [];
  const active = opts.activeTags || new Set();
  const tagChip = (t) => opts.onTag
    ? `<button type="button" class="chip filter-chip${active.has(t) ? " active" : ""}" data-tag="${escapeHTML(t)}" aria-pressed="${active.has(t)}">#${escapeHTML(t)}</button>`
    : `<a class="chip" href="${escapeHTML(tagURL(t))}">#${escapeHTML(t)}</a>`;
  li.innerHTML = `
    <div class="page-card-head">
      <a class="page-card-title" href="${escapeHTML(item.url)}">${escapeHTML(item.title || item.url)}</a>
      ${(item.collections || []).length ? `<span class="page-card-collections">${item.collections.map((t) =>
        `<span class="chip chip-collection">${escapeHTML(t)}</span>`).join("")}</span>` : ""}
    </div>
    <span class="page-card-dates">${dateHTML(item)}${ratingHTML(item)}</span>
    ${(item.bookmarks || []).length ? `<div class="chip-row bookmark-links">${item.bookmarks.map((b) =>
      `<a class="chip chip-link" href="${escapeHTML(b.url)}" rel="noopener external" target="_blank">${escapeHTML(b.label)}</a>`).join("")}</div>` : ""}
    ${opts.summaryHTML ? `<p class="page-card-summary">${opts.summaryHTML}</p>`
      : item.summary ? `<p class="page-card-summary">${escapeHTML(item.summary)}</p>` : ""}
    ${tags.length ? `<div class="chip-row">${tags.slice(0, 6).map(tagChip).join("")}</div>` : ""}`;
  if (opts.onTag) {
    li.querySelectorAll("[data-tag]").forEach((b) => b.addEventListener("click", () => opts.onTag(b.dataset.tag)));
  }
  return li;
}
