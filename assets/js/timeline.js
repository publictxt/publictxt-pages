// The timeline: pages by year and month written, newest first, drawn on a
// rail. Two modes, one renderer:
//   filter   counts only (list.js, search.js). A year or month label picks
//            the date filter (?year=, ?month=); a year's node opens its months.
//   archive  titles too (page-timeline.js), each after its day of the month,
//            shown once per day so the column groups them. Labels link to the
//            section's list at that date; a month's node opens its titles; the
//            current page is marked.
// A timeline section's contents is the archive markup server-rendered;
// markContents() marks the list's date on it.
//
// Month numbers are `created`'s own digits, never a Date: a reader's zone
// would shift the month (date-labels.html). Month names are Hugo's
// (js-params.html `months`), so JS never formats a date.

// "01"–"12" from an item's created, as `year` is its first four digits.
export const monthOf = (it) => (it.created || "").slice(5, 7);
// "1"–"31", likewise, for archive titles.
export const dayOf = (it) => String(Number((it.created || "").slice(8, 10)) || "");

// ?month= : "01"–"12", only beside a year; else no filter.
export function monthFilter(v, year) {
  return year && /^(0[1-9]|1[0-2])$/.test(v || "") ? v : "";
}

// The year of an undated page (Hugo's zero date), as index.json's `year` and
// Pagefind's filters give it. It has no place on the rail.
const UNDATED = "0001";

// Items -> [{ year, count, months: [{ month, count, items }] }]: years and
// months newest first, items within a month newest first. Undated pages
// (no createdLabel) are left out.
export function timeline(items) {
  const years = new Map();
  for (const it of items) {
    if (!it.createdLabel) continue;
    const y = years.get(it.year) || years.set(it.year, new Map()).get(it.year);
    const m = monthOf(it);
    (y.get(m) || y.set(m, []).get(m)).push(it);
  }
  const newest = (a, b) => (Date.parse(b.created) || 0) - (Date.parse(a.created) || 0);
  return build([...years].map(([year, months]) =>
    [year, [...months].map(([month, its]) => ({ month, count: its.length, items: its.sort(newest) }))]));
}

// An archive's tag chips (params.timelineTags): of `wanted`, matched
// case-insensitively, the tags some dated items carry and some don't — a tag
// on all or none filters nothing. In the items' spelling, in `wanted`'s order.
export function splittingTags(items, wanted) {
  const dated = items.filter((it) => it.createdLabel);
  const out = [];
  for (const w of wanted) {
    const lw = w.toLowerCase();
    const spelt = (it) => (it.tags || []).find((t) => t.toLowerCase() === lw);
    const hits = dated.filter(spelt);
    if (hits.length && hits.length < dated.length) out.push(spelt(hits[0]));
  }
  return out;
}

// Pagefind's `month` filter counts ({ "2017-10": 3 }, pagefind-keys.html) ->
// the same tree, without items. Empty and undated months left out.
export function countsTree(counts) {
  const years = new Map();
  for (const [key, count] of Object.entries(counts || {})) {
    const [year, month] = key.split("-");
    if (!count || year === UNDATED || !monthFilter(month, year)) continue;
    (years.get(year) || years.set(year, []).get(year)).push({ month, count, items: [] });
  }
  return build([...years]);
}

// [[year, months]] -> the tree, newest first.
function build(years) {
  const desc = (a, b) => b.localeCompare(a);
  return years.sort((a, b) => desc(a[0], b[0])).map(([year, months]) => ({
    year,
    count: months.reduce((n, m) => n + m.count, 0),
    months: months.sort((a, b) => desc(a.month, b.month)),
  }));
}

// Months in a tree; the panel shows only when there are two or more.
export const monthCount = (tree) => tree.reduce((n, y) => n + y.months.length, 0);

/**
 * Fills `ol` with the tree's rows. Options:
 *   year, month  the date filter, or in archive mode the current page's ("" = none)
 *   open         Set of open keys, "2017" and "2017-10"; toggles mutate it
 *   names        month names, January first (@params months)
 *   rerender()   after a node toggles
 * Filter mode:
 *   pick(y, m)   a year (m "") or month label pressed; the caller renders
 * Archive mode:
 *   href(y, m)   a year's (m "") or month's link
 *   current      the current page's URL, marked among the titles
 */
export function renderTimeline(ol, tree, opts) {
  const { year, month, open, names } = opts;
  const archive = Boolean(opts.href);
  const name = (m) => names[Number(m) - 1] || m;
  // Bars scale to the year's busiest month: each year's shape, its months
  // against each other. Years compare by their counts.
  const peakOf = (y) => Math.max(1, ...y.months.map((m) => m.count));
  const plural = (n) => `${n} page${n === 1 ? "" : "s"}`;

  // A node that opens `key`'s row; a plain dot when there's nothing to open.
  function node(key, fullLabel, opens) {
    if (!opens) {
      const dot = document.createElement("span");
      dot.className = "tl-node tl-dot";
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }
    const isOpen = open.has(key);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tl-node";
    b.setAttribute("aria-expanded", String(isOpen));
    b.setAttribute("aria-label", (isOpen ? "Hide " : "Show ") + fullLabel);
    b.addEventListener("click", () => {
      if (open.has(key)) open.delete(key); else open.add(key);
      opts.rerender();
    });
    return b;
  }

  // Filter: a button that picks the date — and opens its row; a year's also
  // shuts the other years, to focus it. Archive: a link to the list at it.
  function label(key, text, fullLabel, y, m, active) {
    if (archive) {
      const a = document.createElement("a");
      a.className = "tl-pick";
      a.href = opts.href(y, m);
      a.textContent = text;
      a.title = `List ${fullLabel}`;
      return a;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tl-pick";
    b.textContent = text;
    b.setAttribute("aria-pressed", String(active));
    b.title = active ? "Click to clear" : `Show ${fullLabel} only`;
    b.addEventListener("click", () => {
      if (!m) for (const k of [...open]) if (k.split("-")[0] !== key) open.delete(k);
      open.add(key);
      // Unpicking a month goes back up to its year.
      if (m) opts.pick(y, active ? "" : m); else opts.pick(active ? "" : y, "");
    });
    return b;
  }

  function row(nodeEl, labelEl, graphic, count) {
    const div = document.createElement("div");
    div.className = "tl-row";
    const n = document.createElement("span");
    n.className = "count";
    n.textContent = count;
    div.append(nodeEl, labelEl, graphic, n);
    return div;
  }

  const bar = (count, peak, title) => {
    const b = document.createElement("i");
    b.style.setProperty("--v", String(count / peak));
    if (!count) b.className = "none";
    if (title) b.title = title;
    return b;
  };

  // The link's title carries the full date, so the day is visual only.
  function pageList(items) {
    const ul = document.createElement("ul");
    ul.className = "tl-pages";
    let last = "";
    for (const it of items) {
      const d = dayOf(it);
      const day = document.createElement("span");
      day.className = "tl-day";
      day.setAttribute("aria-hidden", "true");
      if (d !== last) day.textContent = d;
      const a = document.createElement("a");
      a.href = it.url;
      a.textContent = it.title || it.url;
      a.title = it.createdLabel;
      if (it.url === opts.current) a.setAttribute("aria-current", "page");
      const li = document.createElement("li");
      if (last && d !== last) li.className = "tl-newday";
      li.append(day, a);
      ul.append(li);
      last = d;
    }
    return ul;
  }

  ol.replaceChildren(...tree.map((y) => {
    const key = y.year;
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
    li.append(row(node(key, y.year, true), label(key, y.year, y.year, y.year, "", year === y.year && !month),
      spark, y.count));
    if (!open.has(key)) return li;

    const months = document.createElement("ol");
    months.className = "tl-months";
    months.append(...y.months.map((m) => {
      const mkey = `${y.year}-${m.month}`;
      const full = `${name(m.month)} ${y.year}`;
      const on = year === y.year && month === m.month;
      const mli = document.createElement("li");
      mli.className = "tl-month" + (open.has(mkey) ? " open" : "") + (on ? " current" : "");
      const track = document.createElement("span");
      track.className = "tl-bar";
      track.setAttribute("aria-hidden", "true");
      track.append(bar(m.count, peakOf(y)));
      mli.append(row(node(mkey, full, archive), label(mkey, name(m.month), full, y.year, m.month, on), track, m.count));
      if (archive && open.has(mkey)) mli.append(pageList(m.items));
      return mli;
    }));
    li.append(months);
    return li;
  }));
}

/**
 * A timeline section's contents (timeline/content.html), server-rendered:
 * marks the date the list is on as renderTimeline() does — the year's row
 * current, the picked label's too — matching each label's own ?year=&month=
 * link. `refocus` (the date changed): its year and month open and the other
 * years shut, as a year pick does.
 */
export function markContents(el, year, month, refocus) {
  for (const a of el.querySelectorAll(".tl-pick")) {
    const p = new URL(a.href).searchParams;
    const y = p.get("year"), m = p.get("month") || "";
    const li = a.closest("li");
    const details = li.querySelector(":scope > details");
    li.classList.toggle("current", y === year && (!m || m === month));
    if (y === year && m === month) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
    if (refocus && year) details.open = m ? details.open || (y === year && m === month) : y === year;
  }
}
