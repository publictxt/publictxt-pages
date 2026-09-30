// A page's archive (page-timeline.html): its section's pages on the timeline
// in archive mode (timeline.js) — the page's year and month open, the page
// marked, and each year or month label a link to the section's list at that
// date. Needs a second page in the section; else it stays hidden.
import * as params from "@params";   // js-params.html
import { siteIndex, scope } from "./site-index.js";
import { monthOf, renderTimeline, timeline } from "./timeline.js";

async function mount(el) {
  const { section, url } = el.dataset;
  let items;
  try {
    items = scope(await siteIndex(), "section", section);
  } catch (e) {
    return;   // no index, no archive
  }
  const tree = timeline(items);
  if (tree.reduce((n, y) => n + y.count, 0) < 2) return;

  const self = items.find((it) => it.url === url);
  const year = self?.createdLabel ? self.year : "";
  const month = year ? monthOf(self) : "";
  const open = new Set(year ? [year, `${year}-${month}`] : [tree[0].year]);
  const ol = el.querySelector(".tl");
  const draw = () => renderTimeline(ol, tree, {
    year, month, open, names: params.months, current: url,
    href: (y, m) => `${section}?year=${y}` + (m ? `&month=${m}` : ""),
    rerender: draw,
  });
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
