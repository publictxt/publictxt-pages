---
covers:
  - layouts/_partials/rating.html
  - layouts/_partials/sidebar.html
---

# Ratings

`rating: 1`–`5` (integers) in front matter; no config — the filter and sorts appear
once any page has one. `rating.html` is the only reader (bad values warn, id
`rating-invalid`), feeding `list-json.html`, `pagefind-keys.html` and the sidebar
stars (paired with `ratingHTML()` in `cards.js`).

**Filter is a minimum**: `?rating=4` = 4 or better (`list.js` compares; `search.js`
sends Pagefind `{ any: ["4", "5"] }`), plus `?rating=unrated`. `ratingFilter()` /
`ratingFilterLabel()` in `cards.js` read and label the value for both.

**Sort**: *Top* / *Lowest rated*, unrated as 2.5 so neither direction leads with them
(5, 4, 3, unrated, 2, 1). That 2.5 is sort-only, and a client/server pair
([../traps.md](../traps.md)). Browse-list ties go newest first.
