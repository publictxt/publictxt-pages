// The one sort vocabulary for list.js and search.js. "<field>[ asc|desc]";
// the canonical (URL) form omits the field's natural direction.
export const SORTS = [
  ["created", "Newest"],
  ["created asc", "Oldest"],
  ["title", "Title A→Z"],
  ["title desc", "Title Z→A"],
  ["rating", "Top rated"],
  ["rating asc", "Lowest rated"],
  ["updated", "Recently updated"],
  ["updated asc", "Least recently updated"],
];

export const FIELDS = ["updated", "created", "title", "rating"];

// Unrated pages' sort value, mid-scale. Same as pagefind-keys.html.
export const UNRATED = 2.5;

export function normaliseSort(s) {
  const [field = "created", dir] = String(s || "").trim().toLowerCase().split(/\s+/);
  const f = FIELDS.includes(field) ? field : "created";
  const d = dir === "asc" || dir === "desc" ? dir : (f === "title" ? "asc" : "desc");
  const isDefault = f === "title" ? d === "asc" : d === "desc";
  return isDefault ? f : `${f} ${d}`;
}

// { field, dir } with the direction made explicit.
export function parseSort(s) {
  const [field, dir] = normaliseSort(s).split(" ");
  return { field, dir: dir || (field === "title" ? "asc" : "desc") };
}

// A date sort's field's ISO string for an item, "" when undated (Hugo's zero
// date). grouper() and groupDay() read its digits, as timeline.js's monthOf:
// the page's own date, no zone shift.
function dateOf(it, field) {
  const d = it[field] || "";
  return /^\d{4}-\d{2}-\d{2}/.test(d) && !d.startsWith("0001") ? d : "";
}
const dateField = (sort) => { const { field } = parseSort(sort); return field === "created" || field === "updated" ? field : null; };

// How `sort` groups cards: a function from an item to its group key, or null
// when it doesn't group. A date sort groups by that date's month, "2026-09"
// ("" undated). Title and rating don't group (yet).
export function grouper(sort) {
  const f = dateField(sort);
  return f && ((it) => dateOf(it, f).slice(0, 7));
}

// A card's day of the month in its date group, "1"–"31" ("" undated); null
// when `sort` isn't by date.
export function groupDay(sort) {
  const f = dateField(sort);
  return f && ((it) => String(Number(dateOf(it, f).slice(8, 10)) || ""));
}

// `shown` (a page of sorted items) in runs by key: [{ key, items, total }],
// `total` that key's count in `all`, so a run split across pages says so.
export function groups(shown, keyOf, all) {
  const totals = new Map();
  for (const it of all) { const k = keyOf(it); totals.set(k, (totals.get(k) || 0) + 1); }
  const out = [];
  for (const it of shown) {
    const k = keyOf(it);
    if (out.at(-1)?.key !== k) out.push({ key: k, items: [], total: totals.get(k) || 0 });
    out.at(-1).items.push(it);
  }
  return out;
}

export function sortLabel(s) {
  return (SORTS.find(([v]) => v === s) || [, s])[1];
}
