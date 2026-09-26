---
covers:
  - layouts/_partials/categories.html
  - layouts/_partials/list-json.html
  - layouts/_partials/pagefind-keys.html
  - layouts/_partials/sidebar.html
  - layouts/_partials/category-counts.html
  - hugo.toml
---

# Categories

A **closed, curated** vocabulary beside open-ended tags *([D11](../decisions/D11.md))*:
a page's `categories:` and/or `category:` (each a value or a list) from
`[params.categories] list` in `hugo.toml` *([D12](../decisions/D12.md))*.

`categories.html` is the only reader, returning a deduped list in the config's
spelling. It feeds `list-json.html` (`categories[]`, a browse-list chip row) and
`pagefind-keys.html` (a search filter, one hidden span per value), both
`?category=`, repeatable. Chips OR: selected categories widen the list, and count
without the category filter.
Unlisted values warn (`warnidf` id `category-unknown`, silenced via `ignoreLogs`).

**The toggle lives in one place**: disabled, no page has a category, so both UIs hide
the facet on empty data — no JS knows about `enabled`. A deploy can flip it with
`HUGO_PARAMS_CATEGORIES_ENABLED=false`.

Not a Hugo taxonomy, so no term pages: the sidebar links to `/search/?category=<c>`
instead — a page's own chips, and site-wide chips (tag-cloud style) from `category-counts.html`
(config order, used only). Its counts include sections, as Pagefind's do, so they
match the search. Sync passes the keys through.
