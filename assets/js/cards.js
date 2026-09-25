// The one page-card renderer, shared by the browse lists (list.js) and the
// search page (search.js). Takes the item shape of index.json:
//   { url, title, type, section, tags[], created, updated, summary, bookmarks[], rating }
// Search maps Pagefind results onto the same shape.

export function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const DAY = 86400e3;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2 Jan 2006", the same form Hugo's page-date.html renders.
export function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Same rule as page-date.html: show "updated" only when it is more than a day after "created".
export function dateHTML(item) {
  if (!item.created) return "";
  let html = `<time class="muted" datetime="${escapeHTML(item.created)}">${escapeHTML(formatDate(item.created))}</time>`;
  if (item.updated && new Date(item.updated) - new Date(item.created) > DAY) {
    html += ` <span class="muted">· updated <time datetime="${escapeHTML(item.updated)}">${escapeHTML(formatDate(item.updated))}</time></span>`;
  }
  return html;
}

// Same as bookmark-label.html: scheme, www. and trailing slash dropped.
export function bookmarkLabel(url) {
  return "↗ " + url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

// Same stars as sidebar.html: five outlines, filled to `--rating` by main.css,
// so 3.5 shows three and a half. `rating` is 1–5, absent when unrated.
export function ratingHTML(item) {
  const r = Number(item.rating);
  return r ? ` <span class="rating" role="img" aria-label="Rated ${r} of 5" style="--rating: ${r}">☆☆☆☆☆</span>` : "";
}

// The rating filter, as `?rating=` spells it: "1"–"5" means that or better
// (3 takes 3.5),
// "unrated" means no rating; anything else is no filter. Shared by list.js and
// search.js so both read the URL the same way.
export const UNRATED_FILTER = "unrated";
export function ratingFilter(v) {
  return /^[1-5]$/.test(v || "") || v === UNRATED_FILTER ? v : "";
}

// A rating filter value as the lists and search show it: "★4+", "★5", "Unrated".
export function ratingFilterLabel(v) {
  return v === UNRATED_FILTER ? "Unrated" : `★${v}${Number(v) < 5 ? "+" : ""}`;
}

// Tag pages live at <base>/tags/<term>/; the base path comes from
// <html data-base> so a site served from a sub-path still resolves.
export function tagURL(name) {
  const base = document.documentElement.dataset.base || "/";
  return base.replace(/\/?$/, "/") + "tags/" + encodeURIComponent(name.toLowerCase()) + "/";
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
      ${item.type ? `<span class="chip chip-type">${escapeHTML(item.type)}</span>` : ""}
    </div>
    ${dateHTML(item)}${ratingHTML(item)}
    ${(item.bookmarks || []).length ? `<div class="chip-row bookmark-links">${item.bookmarks.map((u) =>
      `<a class="chip chip-link" href="${escapeHTML(u)}" rel="noopener external" target="_blank">${escapeHTML(bookmarkLabel(u))}</a>`).join("")}</div>` : ""}
    ${opts.summaryHTML ? `<p class="page-card-summary">${opts.summaryHTML}</p>`
      : item.summary ? `<p class="page-card-summary">${escapeHTML(item.summary)}</p>` : ""}
    ${tags.length ? `<div class="chip-row">${tags.slice(0, 6).map(tagChip).join("")}</div>` : ""}`;
  if (opts.onTag) {
    li.querySelectorAll("[data-tag]").forEach((b) => b.addEventListener("click", () => opts.onTag(b.dataset.tag)));
  }
  return li;
}
