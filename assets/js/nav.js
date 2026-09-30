// The header's ☰ (baseof.html): shows and hides the left nav. Wide, it
// collapses the column, remembered per browser; below DRAWER the nav is a
// drawer over the page, closed by ☰, Escape, a click outside or widening.
// A blocking script in <head> (head.html), so `js` — which main.css needs to
// show the button and make the drawer — and a collapsed column are set before
// first paint; the rest waits for the DOM.
import { DRAWER } from "./layout.js";

const KEY = "publictxt-nav";   // "collapsed", or absent
const html = document.documentElement;
html.classList.add("js");
try {
  if (localStorage.getItem(KEY) === "collapsed") html.setAttribute("data-nav-collapsed", "");
} catch (e) { /* storage blocked: start open */ }

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".nav-toggle");
  const nav = btn && document.getElementById(btn.getAttribute("aria-controls"));
  if (!nav) return;
  const drawer = matchMedia(DRAWER);
  const sync = () => btn.setAttribute("aria-expanded", String(drawer.matches
    ? html.hasAttribute("data-nav-open") : !html.hasAttribute("data-nav-collapsed")));
  const close = () => { html.removeAttribute("data-nav-open"); sync(); };

  btn.addEventListener("click", () => {
    if (drawer.matches) {
      if (html.toggleAttribute("data-nav-open")) nav.querySelector("a")?.focus({ preventScroll: true });
    } else {
      const collapsed = html.toggleAttribute("data-nav-collapsed");
      try {
        if (collapsed) localStorage.setItem(KEY, "collapsed"); else localStorage.removeItem(KEY);
      } catch (e) { /* not remembered */ }
    }
    sync();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && html.hasAttribute("data-nav-open")) { close(); btn.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (html.hasAttribute("data-nav-open") && !nav.contains(e.target) && !btn.contains(e.target)) close();
  });
  drawer.addEventListener("change", close);
  sync();
});
