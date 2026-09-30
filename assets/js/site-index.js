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

/**
 * The pages a list shows.
 *   section    every page below this section's path (.RegularPagesRecursive)
 *   tag        every page carrying this tag (term .Pages)
 *   collection every page of this collection, wherever filed (_partials/collection-pages.html)
 *   recent     the N most recently updated, site-wide; 0 = all (home): the
 *              index arrives in recent.html's order, so a slice
 */
export function scope(items, kind, value) {
  switch (kind) {
    case "section":
      return items.filter((it) => it.url !== value && it.url.startsWith(value));
    case "tag": {
      const want = String(value).toLowerCase();
      return items.filter((it) => (it.tags || []).some((t) => t.toLowerCase() === want));
    }
    case "collection":
      return items.filter((it) => (it.collections || []).includes(value));
    case "recent": {
      const n = parseInt(value, 10) || 0;
      return n > 0 ? items.slice(0, n) : items;
    }
    default:
      return items;
  }
}
