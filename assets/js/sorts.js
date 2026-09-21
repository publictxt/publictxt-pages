// The one sort vocabulary, shared by the browse lists (list.js) and the search
// page (search.js) so both offer the same options and the same `?sort=` values.
//
// A sort is "<field>[ asc|desc]" over updated | created | title. Its canonical
// form leaves the field's natural direction implicit ("updated", "title",
// "created asc"), which is also what goes in the URL.
export const SORTS = [
  ["updated", "Recently updated"],
  ["created", "Newest"],
  ["created asc", "Oldest"],
  ["title", "Title A→Z"],
  ["title desc", "Title Z→A"],
  ["updated asc", "Least recently updated"],
];

export const FIELDS = ["updated", "created", "title"];

export function normaliseSort(s) {
  const [field = "updated", dir] = String(s || "").trim().toLowerCase().split(/\s+/);
  const f = FIELDS.includes(field) ? field : "updated";
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
