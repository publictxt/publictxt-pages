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

export function sortLabel(s) {
  return (SORTS.find(([v]) => v === s) || [, s])[1];
}
