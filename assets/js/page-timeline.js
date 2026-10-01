// A page's archive (page-timeline.html): pages on the timeline in archive
// mode (timeline.js) — the page's year and month open, the page marked, each
// year or month label a link to the list (data-list) at that date.
//   data-section      that section's pages
//   data-collections  pages of any of these collections, one timeline, with
//                     collection chips (facets.js, as configured) to narrow
//                     it; remembered per browser, and carried into the links
//   data-tags         params.timelineTags, as JSON: a chip each where the tag
//                     splits the timeline (splittingTags), the tag facet's
//                     states; remembered and carried alike. Panel-only, so
//                     it works without the tag chip facet, unlinked then.
// Needs a second page; else it stays hidden.
import * as params from "@params";   // js-params.html
import { chipFacets, filterChip, isSet, matches, readFacet, writeFacet } from "./facets.js";
import { siteIndex, scope } from "./site-index.js";
import { monthOf, renderTimeline, splittingTags, timeline } from "./timeline.js";

const FACETS = chipFacets(params.chipFacets).defs;
const COLLECTION = FACETS.find((d) => d.key === "collection");
const TAG = FACETS.find((d) => d.key === "tag");
const KEY = "timeline-collections";   // the chips' state (tags too), as a query string

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
  // collection chip facet is configured; then the tags that split it.
  const present = group.filter((c) => items.some((it) => it.collections.includes(c)));
  let wanted = [];
  try { wanted = JSON.parse(el.dataset.tags || "[]"); } catch { /* none */ }
  const tags = splittingTags(items, wanted);
  const chipRow = el.querySelector(".tl-chips");
  let saved;
  try { saved = new URLSearchParams(localStorage.getItem(KEY) || ""); } catch { saved = new URLSearchParams(); }
  const restore = (key, def, values) => {
    const out = readFacet(saved, key, def?.states, def?.modes);
    for (const s of [out.inc, out.exc]) for (const v of [...s]) if (!values.includes(v)) s.delete(v);
    return out;
  };
  const f = COLLECTION && present.length > 1 ? restore("collection", COLLECTION, present) : null;
  const tf = tags.length ? restore("tag", TAG, tags) : null;
  const save = () => {
    const p = new URLSearchParams();
    for (const x of [f, tf]) if (x) writeFacet(p, x);
    try { localStorage.setItem(KEY, p.toString()); } catch { /* this page only, then */ }
  };

  // The list at a date: the chips' collections, as includes, when the facet
  // can match any of them; else the date alone. Tag chips as set, when the
  // list has the tag facet.
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
    if (tf && TAG && isSet(tf)) writeFacet(p, tf);
    return `${list}?${p}`;
  }

  function draw() {
    const shown = items.filter((it) => (!f || matches(f, it.collections)) && (!tf || matches(tf, it.tags || [])));
    const onPress = () => { save(); draw(); };
    if (f || tf) {
      chipRow.replaceChildren(
        ...(f ? present.map((c) => filterChip(f, c, c,
          items.filter((it) => it.collections.includes(c)).length, onPress)) : []),
        ...(tf ? tags.map((t) => filterChip(tf, t, "#" + t,
          items.filter((it) => (it.tags || []).includes(t)).length, onPress)) : []));
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
