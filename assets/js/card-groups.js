// Cards under group headings, for list.js and search.js: a date sort by
// month, a rating sort by stars. Each group is a fold, open, its heading — a
// title, a rule, a count — pinned while its cards scroll by (main.css
// .card-group). Month names come from the caller (js-params.html), so JS
// never formats a date.
import { ratingHTML } from "./cards.js";
import { parseSort } from "./sorts.js";

// How `sort` groups cards: a function from an item to its group key, or null
// when it doesn't group; "" when the item has no value (undated, unrated).
// A date sort groups by that date's month, "2026-09" (Hugo's zero date is
// undated), read from the ISO string's digits as timeline.js's monthOf: the
// page's own date, no zone shift — and the form of Pagefind's month filter.
// A rating sort groups by stars, "1"–"5"; unrated pages sort, and so group,
// as UNRATED. Title doesn't group (yet).
export function grouper(sort) {
  const { field } = parseSort(sort);
  if (field === "rating") return (it) => (it.rating ? String(it.rating) : "");
  if (field !== "created" && field !== "updated") return null;
  return (it) => {
    const d = it[field] || "";
    return /^\d{4}-\d{2}/.test(d) && !d.startsWith("0001") ? d.slice(0, 7) : "";
  };
}

// How many of `items` have each key: Map key -> count.
export function countBy(items, keyOf) {
  const m = new Map();
  for (const it of items) { const k = keyOf(it); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

// A group's count: "9 pages", or "4 of 9 pages" while the rest are on other
// pages or not yet shown; "" when the total is unknown.
export function groupCount(shown, total) {
  if (total == null) return "";
  const pages = `${total} page${total === 1 ? "" : "s"}`;
  return shown < total ? `${shown} of ${pages}` : pages;
}

/**
 * A group's title (an <h2>) for a grouper() key. Stars as the cards' — no
 * link, as the rating filter is a minimum (★4 would list the 5s too); or a
 * month, its year muted. Options:
 *   field        the sort's field (parseSort)
 *   months       month names, January first
 *   href(y, m)   a created month's link to that date filter (the filter's
 *                date); null leaves it plain, as when the list is on it
 *   pick(y, m)   that link's plain click
 */
export function groupTitle(key, { field, months, href, pick }) {
  const h = document.createElement("h2");
  h.className = "card-group-title";
  if (field === "rating") {
    if (key) h.innerHTML = ratingHTML({ rating: Number(key) }).trim();
    else h.append("Unrated");
    return h;
  }
  if (!key) {
    h.append("Undated");
    return h;
  }
  const [y, m] = key.split("-");
  const year = Object.assign(document.createElement("span"), { className: "card-group-year", textContent: y });
  const url = field === "created" && href(y, m);
  let label = h;
  if (url) {
    label = Object.assign(document.createElement("a"), { href: url, title: `List ${months[Number(m) - 1]} ${y}` });
    label.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // let new-tab clicks through
      e.preventDefault();
      pick(y, m);
    });
    h.append(label);
  }
  label.append(months[Number(m) - 1] + " ", year);
  return h;
}

/**
 * Appends cards to `list` in their sort order, a new group whenever keyOf
 * changes, so a later call (search's "Show more") carries on the last
 * group. title(key): its heading's title; total(key): its size across every
 * page or batch, or undefined. Returns add(item, cardElement).
 */
export function cardGroups(list, keyOf, { title, total }) {
  let open = null;   // the last group: { key, shown, items, count }
  return (item, el) => {
    const key = keyOf(item);
    if (open?.key !== key) {
      open = { key, shown: 0, ...groupShell(title(key)) };
      list.append(open.li);
    }
    open.items.append(el);
    open.count.textContent = groupCount(++open.shown, total(key));
  };
}

function groupShell(title) {
  const li = document.createElement("li");
  li.className = "card-group";
  const fold = document.createElement("details");
  fold.open = true;
  const head = document.createElement("summary");
  head.className = "card-group-head";
  head.innerHTML = `<span class="tl-node" aria-hidden="true"></span>`;
  const rule = Object.assign(document.createElement("span"), { className: "card-group-rule" });
  const count = Object.assign(document.createElement("span"), { className: "count" });
  head.append(title, rule, count);
  const items = Object.assign(document.createElement("ul"), { className: "card-group-items" });
  fold.append(head, items);
  li.append(fold);
  return { li, items, count };
}
