// The timeline panel of a browse list (list.js): its pages by year and month
// written, newest first — a blog archive, drawn on a rail. A year or month
// picks the list's date filter (?year=, ?month=); its node opens it.
//
// Month numbers are `created`'s own digits, never a Date: a reader's zone
// would shift the month (date-labels.html). Month names are Hugo's
// (js-params.html `months`), so JS never formats a date.

// "01"–"12" from an item's created, as `year` is its first four digits.
export const monthOf = (it) => (it.created || "").slice(5, 7);

// ?month= : "01"–"12", only beside a year; else no filter.
export function monthFilter(v, year) {
  return year && /^(0[1-9]|1[0-2])$/.test(v || "") ? v : "";
}

// Items -> [{ year, count, months: [{ month, count, items }] }]: years and
// months newest first, items within a month newest first. Undated pages
// (no createdLabel) have no place on it and are left out.
export function timeline(items) {
  const years = new Map();
  for (const it of items) {
    if (!it.createdLabel) continue;
    const y = years.get(it.year) || years.set(it.year, new Map()).get(it.year);
    const m = monthOf(it);
    (y.get(m) || y.set(m, []).get(m)).push(it);
  }
  const newest = (a, b) => (Date.parse(b.created) || 0) - (Date.parse(a.created) || 0);
  const desc = (a, b) => b[0].localeCompare(a[0]);
  return [...years].sort(desc).map(([year, months]) => {
    const ms = [...months].sort(desc).map(([month, its]) => ({ month, count: its.length, items: its.sort(newest) }));
    return { year, count: ms.reduce((n, m) => n + m.count, 0), months: ms };
  });
}

// Months in a tree; the panel shows only when there are two or more to pick.
export const monthCount = (tree) => tree.reduce((n, y) => n + y.months.length, 0);

// Titles under an open month before "+N more", which picks the month instead.
export const PAGES_SHOWN = 8;

/**
 * Fills `ol` with the tree's rows. Options:
 *   year, month  the list's date filter ("" when off)
 *   open         Set of open keys, "2017" and "2017-10"; toggles mutate it
 *   names        month names, January first (@params months)
 *   pick(y, m)   a year (m "") or month label pressed; the caller renders
 *   rerender()   after a node toggles
 */
export function renderTimeline(ol, tree, opts) {
  const { year, month, open, names } = opts;
  const name = (m) => names[Number(m) - 1] || m;
  // Bars scale to the year's busiest month: each year's shape, its months
  // against each other. Years compare by their counts.
  const peakOf = (y) => Math.max(1, ...y.months.map((m) => m.count));
  const plural = (n) => `${n} page${n === 1 ? "" : "s"}`;

  // One row: node (toggle), label (filter), graphic, count.
  // A label opens its row; a year's also shuts the other years, to focus it.
  function row(key, label, fullLabel, count, active, onPick, graphic) {
    const isOpen = open.has(key);
    const div = document.createElement("div");
    div.className = "tl-row";
    const node = document.createElement("button");
    node.type = "button";
    node.className = "tl-node";
    node.setAttribute("aria-expanded", String(isOpen));
    node.setAttribute("aria-label", (isOpen ? "Hide " : "Show ") + fullLabel);
    node.addEventListener("click", () => {
      if (open.has(key)) open.delete(key); else open.add(key);
      opts.rerender();
    });
    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "tl-pick";
    pick.textContent = label;
    pick.setAttribute("aria-pressed", String(active));
    pick.title = active ? "Click to clear" : `Show ${fullLabel} only`;
    pick.addEventListener("click", () => {
      if (!key.includes("-")) for (const k of [...open]) if (k.split("-")[0] !== key) open.delete(k);
      open.add(key);
      onPick();
    });
    const n = document.createElement("span");
    n.className = "count";
    n.textContent = count;
    div.append(node, pick, graphic, n);
    return div;
  }

  const bar = (count, peak, title) => {
    const b = document.createElement("i");
    b.style.setProperty("--v", String(count / peak));
    if (!count) b.className = "none";
    if (title) b.title = title;
    return b;
  };

  ol.replaceChildren(...tree.map((y) => {
    const key = y.year;
    const active = year === y.year && !month;
    const li = document.createElement("li");
    li.className = "tl-year" + (open.has(key) ? " open" : "") + (year === y.year ? " current" : "");
    // Jan..Dec, one bar each: the year at a glance.
    const spark = document.createElement("span");
    spark.className = "tl-spark";
    spark.setAttribute("aria-hidden", "true");
    const byMonth = new Map(y.months.map((m) => [m.month, m.count]));
    for (let i = 1; i <= 12; i++) {
      const m = String(i).padStart(2, "0");
      const c = byMonth.get(m) || 0;
      spark.append(bar(c, peakOf(y), `${name(m)}: ${plural(c)}`));
    }
    li.append(row(key, y.year, y.year, y.count, active,
      () => opts.pick(active ? "" : y.year, ""), spark));
    if (!open.has(key)) return li;

    const months = document.createElement("ol");
    months.className = "tl-months";
    months.append(...y.months.map((m) => {
      const mkey = `${y.year}-${m.month}`;
      const on = year === y.year && month === m.month;
      const mli = document.createElement("li");
      mli.className = "tl-month" + (open.has(mkey) ? " open" : "") + (on ? " current" : "");
      const track = document.createElement("span");
      track.className = "tl-bar";
      track.setAttribute("aria-hidden", "true");
      track.append(bar(m.count, peakOf(y)));
      // Unpicking a month goes back up to its year.
      mli.append(row(mkey, name(m.month), `${name(m.month)} ${y.year}`, m.count, on,
        () => opts.pick(y.year, on ? "" : m.month), track));
      if (!open.has(mkey)) return mli;

      const pages = document.createElement("ul");
      pages.className = "tl-pages";
      for (const it of m.items.slice(0, PAGES_SHOWN)) {
        const a = document.createElement("a");
        a.href = it.url;
        a.textContent = it.title || it.url;
        a.title = it.createdLabel;
        const pli = document.createElement("li");
        pli.append(a);
        pages.append(pli);
      }
      // Picked, the list shows the rest; else "more" picks the month.
      if (m.count > PAGES_SHOWN) {
        const more = document.createElement(on ? "span" : "button");
        more.className = on ? "muted" : "tl-more";
        more.textContent = `+${m.count - PAGES_SHOWN} more` + (on ? " in the list" : "");
        if (!on) {
          more.type = "button";
          more.title = `List ${name(m.month)} ${y.year}`;
          more.addEventListener("click", () => opts.pick(y.year, m.month));
        }
        const pli = document.createElement("li");
        pli.append(more);
        pages.append(pli);
      }
      mli.append(pages);
      return mli;
    }));
    li.append(months);
    return li;
  }));
}
