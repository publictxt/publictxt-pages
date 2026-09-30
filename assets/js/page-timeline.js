// A page's archive (page-timeline.html): pages on the timeline in archive
// mode (timeline.js) — the page's year and month open, the page marked, each
// year or month label a link to the list (data-list) at that date.
//   data-section      that section's pages
//   data-collections  pages of any of these collections, one timeline, with
//                     collection chips (facets.js, as configured) to narrow
//                     it; remembered per browser, and carried into the links
// Needs a second page; else it stays hidden.
import * as params from "@params";   // js-params.html
import { chipFacets, filterChip, matches, readFacet, writeFacet } from "./facets.js";
import { siteIndex, scope } from "./site-index.js";
import { monthOf, renderTimeline, timeline } from "./timeline.js";

const COLLECTION = chipFacets(params.chipFacets).defs.find((d) => d.key === "collection");
const KEY = "timeline-collections";   // the chips' state, as a query string

async function mount(el) {
  const { section, url, list } = el.dataset;
  const group = (el.dataset.collections || "").split(" ").filter(Boolean);
  let items;
  try {
    const all = await siteIndex();
    items = group.length ? all.filter((it) => (it.collections || []).some((c) => group.includes(c)))
      : scope(all, "section", section);
  } catch (e) {
    return;   // no index, no archive
  }
  if (items.filter((it) => it.createdLabel).length < 2) return;

  const self = items.find((it) => it.url === url);
  const year = self?.createdLabel ? self.year : "";
  const month = year ? monthOf(self) : "";
  const open = new Set(year ? [year, `${year}-${month}`] : []);
  const ol = el.querySelector(".tl");

  // Chips: the group's collections with pages, when two or more — and the
  // collection chip facet is configured.
  const present = group.filter((c) => items.some((it) => it.collections.includes(c)));
  const chipRow = el.querySelector(".tl-chips");
  let f = null;
  if (COLLECTION && present.length > 1) {
    let saved = "";
    try { saved = localStorage.getItem(KEY) || ""; } catch { /* none */ }
    f = readFacet(new URLSearchParams(saved), "collection", COLLECTION.states, COLLECTION.modes);
    for (const s of [f.inc, f.exc]) for (const v of [...s]) if (!present.includes(v)) s.delete(v);
  }
  const save = () => {
    const p = new URLSearchParams();
    writeFacet(p, f);
    try { localStorage.setItem(KEY, p.toString()); } catch { /* this page only, then */ }
  };

  // The list at a date: the chips' collections, as includes, when the facet
  // can match any of them; else the date alone.
  function href(y, m) {
    const p = new URLSearchParams({ year: y });
    if (m) p.set("month", m);
    if (f || group.length) {
      const shown = present.filter((c) => (!f || !f.exc.has(c)) && (!f?.inc.size || f.inc.has(c)));
      if (shown.length === 1 || COLLECTION?.modes.includes("any")) {
        for (const c of shown) p.append("collection", c);
        if (shown.length > 1 && COLLECTION.modes[0] !== "any") p.set("collection-match", "any");
      }
    }
    return `${list}?${p}`;
  }

  function draw() {
    const shown = f ? items.filter((it) => matches(f, it.collections)) : items;
    if (f) {
      chipRow.replaceChildren(...present.map((c) => filterChip(f, c, c,
        items.filter((it) => it.collections.includes(c)).length, () => { save(); draw(); })));
      chipRow.hidden = false;
    }
    const tree = timeline(shown);
    if (!open.size && tree.length) open.add(tree[0].year);
    if (!tree.length) {
      ol.innerHTML = `<li class="muted tl-empty">No pages match.</li>`;
      return;
    }
    renderTimeline(ol, tree, {
      year, month, open, names: params.months, current: url, href, rerender: draw,
    });
  }
  draw();
  el.hidden = false;
  // In a long month the page can sit past the right column's fold: scroll the
  // column (it scrolls on its own when wide), never the window.
  const cur = ol.querySelector("[aria-current]");
  const box = el.closest(".aside");
  if (cur && box && box.scrollHeight > box.clientHeight) {
    const off = cur.getBoundingClientRect().top - box.getBoundingClientRect().top;
    if (off > box.clientHeight * 0.8) box.scrollTop += off - box.clientHeight / 2;
  }
}

document.querySelectorAll("[data-page-timeline]").forEach(mount);
