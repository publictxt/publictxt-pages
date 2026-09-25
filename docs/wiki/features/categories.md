---
covers:
  - layouts/_partials/category.html
  - layouts/_partials/list-json.html
  - hugo.toml
---

# Categories

A **closed, curated** vocabulary beside open-ended tags *([D11](../decisions/D11.md))*:
one `category:` per page from `[params.categories] list` in `hugo.toml`.

`category.html` is the only reader, feeding `list-json.html` (a browse-list chip row)
and `pagefind-keys.html` (a search filter), both `?category=`. Bad values warn
(`warnidf` ids `category-unknown` / `category-multi`, silenced via `ignoreLogs`).

**The toggle lives in one place**: disabled, no page has a category, so both UIs hide
the facet on empty data — no JS knows about `enabled`. A deploy can flip it with
`HUGO_PARAMS_CATEGORIES_ENABLED=false`.

Not a Hugo taxonomy: no term pages or sidebar chip. Sync passes the key through.
