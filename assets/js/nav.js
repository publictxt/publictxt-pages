// The header's two column buttons (baseof.html): ☰ for the left nav, and
// one for the right column (the page's .aside). Each column is a drawer over
// the page below its breakpoint — the nav below DRAWER, the right column
// below NARROW — closed by its button, Escape, a click outside, the other
// opening, or widening. Wide, ☰ collapses the nav instead, remembered per
// browser; the right button is hidden (main.css).
// A blocking script in <head> (head.html), so `js` — which main.css needs to
// show the buttons and make the drawers — and a collapsed column are set
// before first paint; the rest waits for the DOM.
import { DRAWER, NARROW, drawAsideToggle } from "./layout.js";

const KEY = "publictxt-nav";   // "collapsed", or absent
const html = document.documentElement;
html.classList.add("js");
try {
  if (localStorage.getItem(KEY) === "collapsed") html.setAttribute("data-nav-collapsed", "");
} catch (e) { /* storage blocked: start open */ }

document.addEventListener("DOMContentLoaded", () => {
  const drawers = [];

  // `panel` as a drawer while `media` matches, open while <html> has `attr`
  // (main.css slides it in). Otherwise a press calls `wide`, and `expanded`
  // gives aria-expanded. `drawn` after each change.
  function drawer({ btn, panel, attr, media, wide = () => {}, expanded = () => false, drawn = () => {} }) {
    if (!btn || !panel) return;
    const mq = matchMedia(media);
    const d = {
      btn, panel,
      isOpen: () => html.hasAttribute(attr),
      sync: () => {
        btn.setAttribute("aria-expanded", String(mq.matches ? d.isOpen() : expanded()));
        drawn();
      },
      close: () => { html.removeAttribute(attr); d.sync(); },
    };
    btn.setAttribute("aria-controls", panel.id);
    btn.addEventListener("click", () => {
      if (!mq.matches) wide();
      else {
        for (const o of drawers) if (o !== d) o.close();
        if (html.toggleAttribute(attr)) panel.querySelector("a, button, summary")?.focus({ preventScroll: true });
      }
      d.sync();
    });
    mq.addEventListener("change", d.close);
    drawers.push(d);
    d.sync();
  }

  const navBtn = document.querySelector(".nav-toggle");
  drawer({
    btn: navBtn, panel: navBtn && document.getElementById(navBtn.getAttribute("aria-controls")),
    attr: "data-nav-open", media: DRAWER,
    wide: () => {
      const collapsed = html.toggleAttribute("data-nav-collapsed");
      try {
        if (collapsed) localStorage.setItem(KEY, "collapsed"); else localStorage.removeItem(KEY);
      } catch (e) { /* not remembered */ }
    },
    expanded: () => !html.hasAttribute("data-nav-collapsed"),
  });
  const asideBtn = document.querySelector(".aside-toggle");
  const aside = document.querySelector(".aside");
  if (aside) aside.id ||= "page-aside";
  drawer({
    btn: asideBtn, panel: aside, attr: "data-aside-open", media: NARROW,
    drawn: () => drawAsideToggle(asideBtn),
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    for (const d of drawers) if (d.isOpen()) { d.close(); d.btn.focus(); }
  });
  // The path as dispatched: a chip press re-renders the filters, so by now
  // its target may be out of the document, though it was in the drawer.
  document.addEventListener("click", (e) => {
    const path = e.composedPath();
    for (const d of drawers) if (d.isOpen() && !path.includes(d.panel) && !path.includes(d.btn)) d.close();
  });
});
