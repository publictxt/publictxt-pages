// The layout's breakpoints, for JS: main.css's @media rules — change both.
//   DRAWER  the left nav leaves the grid for a drawer (nav.js)
//   NARROW  one column; the right column's filters dock into the page
export const DRAWER = "(max-width: 1440px)";
export const NARROW = "(max-width: 900px)";

// Keeps `el` in the right column's `slot` — or at the top of `parent` when
// narrow or slotless — moving it as the width crosses NARROW. `placed(narrow)`
// runs after each placement, the first included.
export function dock(el, slot, parent, placed) {
  const mq = matchMedia(NARROW);
  const place = () => {
    if (slot && !mq.matches) slot.append(el); else parent.prepend(el);
    placed?.(mq.matches);
  };
  mq.addEventListener("change", place);
  place();
}
