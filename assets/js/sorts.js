// The one sort vocabulary, shared by the browse lists (list.js) and the search
// page (search.js) so both offer the same options and the same `?sort=` values.
//
// A sort is "<field>[ asc|desc]" over updated | created | title | rating. Its
// canonical form leaves the field's natural direction implicit ("updated",
// "title", "created asc"), which is also what goes in the URL. Rating is
// highest-first only: unrated pages sort as 0, so ascending would lead with
// every unrated page.
export const SORTS = [
  ["created", "Newest"],
  ["created asc", "Oldest"],
  ["title", "Title A→Z"],
  ["title desc", "Title Z→A"],
  ["rating", "Top rated"],
  ["updated", "Recently updated"],
  ["updated asc", "Least recently updated"],
];

export const FIELDS = ["updated", "created", "title", "rating"];

export function normaliseSort(s) {
  const [field = "created", dir] = String(s || "").trim().toLowerCase().split(/\s+/);
  const f = FIELDS.includes(field) ? field : "created";
  if (f === "rating") return f;
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
