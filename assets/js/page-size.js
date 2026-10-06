// Browse lists' page size, the reader's pick: a reading preference, so
// remembered per browser (as cards.js's density) and left out of the URL —
// ?page= then means the same page to whoever opens a link with their own size.
// Storage can throw or be empty; then each list keeps its own default
// (data-per-page). 0 = all.
const KEY = "list-page-size";
const CHOICES = [10, 20, 50, 0];

export function readPageSize(storage) {
  try {
    const v = storage.getItem(KEY);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch { return null; }
}

export function writePageSize(storage, n) {
  try { storage.setItem(KEY, String(n)); } catch { /* this page only, then */ }
}

// The select's sizes, ascending, "all" last: the fixed set plus `extra` — the
// list's own default, so it is always pickable back, and the size in use (one
// remembered from a list with another default, as home's).
export function pageSizes(...extra) {
  const sizes = new Set(CHOICES.filter(Boolean));
  for (const n of extra) if (n > 0) sizes.add(n);
  return [...[...sizes].sort((a, b) => a - b), 0];
}

// The page that holds item `first` (0-based) at `size` a page — so changing the
// size keeps the reader's place.
export function pageHolding(first, size) {
  return size > 0 ? Math.floor(first / size) + 1 : 1;
}
