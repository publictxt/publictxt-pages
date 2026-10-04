// The layout's breakpoints, for JS: main.css's @media rules — change both.
//   DRAWER  the left nav leaves the grid for a drawer (nav.js)
//   NARROW  one column; the right column is a drawer too (nav.js)
export const DRAWER = "(max-width: 1440px)";
export const NARROW = "(max-width: 900px)";

// The right column's header button (baseof.html), as nav.js draws it: the
// column's own label (its aria-label: "Filters", "This page") and a badge
// of filters set; open, "Show <results>", which closes it. Lists and search
// call asideStatus() on each render; nav.js redraws on open and close.
export function asideStatus(picked, results) {
  const btn = document.querySelector(".aside-toggle");
  if (!btn) return;
  btn.dataset.picked = picked || "";
  btn.dataset.results = results || "";
  drawAsideToggle(btn);
}

export function drawAsideToggle(btn) {
  const open = btn.getAttribute("aria-expanded") === "true";
  const { picked, results } = btn.dataset;
  btn.querySelector(".aside-toggle-label").textContent = open && results ? `Show ${results}`
    : document.querySelector(".aside")?.getAttribute("aria-label") || "More";
  const badge = btn.querySelector(".facet-badge");
  badge.textContent = picked || "";
  badge.hidden = open || !picked;
}
