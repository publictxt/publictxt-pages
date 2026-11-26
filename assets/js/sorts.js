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
  ["source-rating", "Top rated source"],
  ["source-rating asc", "Lowest rated source"],
];

export const FIELDS = ["updated", "created", "title", "rating", "source-rating"];

// Unrated pages' sort value, mid-scale. Same as pagefind-keys.html.
export const UNRATED = 2.5;
// This repo's own pages' source rating sort value: above any source, so they
// sort apart from forks, unrated ones included. Same as pagefind-keys.html.
export const OWN_SOURCE = 6;

// The sorts for a list or search: the source rating ones only where there are forks.
export const sortsFor = (hasForks) => hasForks ? SORTS : SORTS.filter(([v]) => !v.startsWith("source-rating"));

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

// Sticky pages (sticky.html) first, each part's order kept — under a list's
// default sort, or Newest; any other pick is the reader's question, a pin no
// answer to it. As sticky-first.html, for the no-JS lists (default order).
export const pinsUnder = (sort, defaultSort) => sort === defaultSort || sort === "created";
export function stickyFirst(items) {
  return [...items.filter((it) => it.sticky), ...items.filter((it) => !it.sticky)];
}

export function sortLabel(s) {
  return (SORTS.find(([v]) => v === s) || [, s])[1];
}
