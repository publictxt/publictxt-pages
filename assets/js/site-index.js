// The site's one page index (site-index.html), fetched once per document from
// <html data-index>; fingerprinted, so cached until the next build. scope()
// subsets mirror the page collections the templates give the no-JS list.

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

// Same order as recent.html: a stable sort over Hugo's default order breaks ties.
function byUpdated(items) {
  return [...items].sort((a, b) => (Date.parse(b.updated) || 0) - (Date.parse(a.updated) || 0));
}

/**
 * The pages a list shows.
 *   section    every page below this section's path (.RegularPagesRecursive)
 *   tag        every page carrying this tag (term .Pages)
 *   bookmarks  every page carrying a bookmark URL (_partials/bookmark-pages.html)
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
      return items.filter((it) => (it.bookmarks || []).length);
    case "recent": {
      const n = parseInt(value, 10) || 0;
      const ordered = byUpdated(items);
      return n > 0 ? ordered.slice(0, n) : ordered;
    }
    default:
      return items;
  }
}
