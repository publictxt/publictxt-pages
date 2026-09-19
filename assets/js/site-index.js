// The site's one page index (see layouts/_partials/site-index.html): every
// regular page, fetched once per document and shared by every [data-list] on
// it. Its URL is on <html data-index>, fingerprinted in production so the
// browser reuses it across navigations until the next build.
//
// Each list page declares *which subset* it shows rather than shipping its own
// copy of the data — the subsets below are the client-side equivalents of the
// page collections the Hugo templates pass to the no-JS fallback list.

let pending;

export function siteIndex() {
  if (!pending) {
    const src = document.documentElement.dataset.index;
    pending = src
      ? fetch(src, { headers: { accept: "application/json" } }).then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
      : Promise.reject(new Error("no site index"));
  }
  return pending;
}

// Most recently updated first — the same order as _partials/recent.html.
// Array.prototype.sort is stable, and the index arrives in Hugo's default
// page order, so pages sharing an `updated` keep that order as the tie-break.
function byUpdated(items) {
  return [...items].sort((a, b) => (Date.parse(b.updated) || 0) - (Date.parse(a.updated) || 0));
}

/**
 * The pages a list shows.
 *   section    every page below this section's path (.RegularPagesRecursive)
 *   tag        every page carrying this tag (term .Pages)
 *   bookmarks  the bookmarks/ subtree plus any page carrying a bookmark URL
 *              (_partials/bookmark-pages.html)
 *   recent     the N most recently updated, site-wide (home)
 */
export function scope(items, kind, value) {
  switch (kind) {
    case "section":
      return items.filter((it) => it.url !== value && it.url.startsWith(value));
    case "tag": {
      const want = String(value).toLowerCase();
      return items.filter((it) => (it.tags || []).some((t) => t.toLowerCase() === want));
    }
    case "bookmarks":
      return items.filter((it) => it.url.startsWith(value) || (it.bookmarks || []).length);
    case "recent": {
      const n = parseInt(value, 10) || 0;
      const ordered = byUpdated(items);
      return n > 0 ? ordered.slice(0, n) : ordered;
    }
    default:
      return items;
  }
}
