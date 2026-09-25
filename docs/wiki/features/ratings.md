---
covers:
  - layouts/_partials/rating.html
  - layouts/_partials/sidebar.html
---

# Ratings

A page opts in with `rating: 1`–`5` in its front matter; decimals allowed (`3.5`). No config: the facet and
sort appear once any page has one, like categories do on empty data.

`rating.html` is the **only reader** of the key: a number 1–5, or 0 for none
(`rating: 0` included). Anything else (`6`, `0.5`, text, a list) is ignored with a
build warning (`warnidf` id `rating-invalid`). Consumers, all through that partial:

- `list-json.html` → `rating` on the `index.json` item (absent when unrated).
- `pagefind-keys.html` → a `rating` filter on every page — the **whole-number part**
  (3.5 → `3`), or `unrated` — the exact value as meta when rated, and a
  `rating[data-rating-sort]` sort key (exact) on **every** page, 2.5 when unrated —
  Pagefind drops pages lacking the sort key ([../traps.md](../traps.md)).
- `sidebar.html` → stars under *This page*; `cards.js` draws the same on cards. Five
  ☆ with ★ laid over them by `main.css`, clipped to `--rating`/5 of the width, so
  3.5 fills three and a half.

**Filter is a minimum**, `?rating=4` = 4 or better, a select beside Sort/Year.
Options are whole numbers whatever the decimals, so ★3+ takes 3.5: `list.js` compares
numbers; `search.js` sends Pagefind `{ any: ["3", "4", "5"] }` over the whole-number
filter values, which stays a finite list however fine the ratings. Its last
option, `?rating=unrated`, is pages with none. `ratingFilter()` / `ratingFilterLabel()`
in `cards.js` are the one reading and display of the value. Browse
lists show it when the list varies on rating (unrated counts as a value, so ★1+
means "rated at all"), with counts over the set filtered by everything but rating;
search shows it when any page is rated, without counts, as for year.

**Sort** is *Top rated* / *Lowest rated* (`sorts.js`), with unrated pages as a
mid-scale 2.5 (`UNRATED`) so neither direction leads with them: 5, 4, 3, unrated, 2,
1 — a page rated exactly 2.5 ties with them. Sort only — the filter still counts unrated as unrated. Browse lists break ties
newest-first either way; Pagefind's tie order is its own.

Not a `sync_content.py` concern; the key passes through untouched.
