---
covers:
  - layouts/_partials/category.html
  - layouts/_partials/list-json.html
  - hugo.toml
---

# Categories

A **closed, curated** vocabulary alongside open-ended tags *([D11](../decisions/D11.md))*.
A page opts in with one `category: <name>` in its front matter. Configured in
`hugo.toml`:

```toml
[params.categories]
  enabled = true
  list = ["essay", "howto", "reference", "project"]
```

`category.html` is the **only reader** of the key. It matches case-insensitively
against `list` and returns the configured spelling, or `""` when categories are
disabled, the page has none, or the value isn't listed. Unlisted values and lists
(`category: [a, b]`) are ignored with a build warning (`warnidf` ids
`category-unknown` / `category-multi`, suppressible via `ignoreLogs`).

Two consumers, both through that partial, so they can't disagree:

- `list-json.html` adds `category` to the page's `index.json` item → a **Category**
  chip row in browse lists (`list.js`), single-select, `?category=`.
- `pagefind-keys.html` adds a `category` Pagefind filter → a **Category** group on
  the search page (`search.js`), same URL spelling.

**The toggle lives in one place.** Disabled (or the block absent), no page has a
category, so the index and Pagefind carry none and both UIs hide the facet on empty
data — neither JS file knows about `enabled`. A content repo's deploy can flip it
without forking `hugo.toml`: `HUGO_PARAMS_CATEGORIES_ENABLED=false`.

A browse list shows the row when some pages have a category, even one — a page with
none is "uncategorised", not a value — and hides a category every page shares, as
with tags. Chip order is by count, not `list` order. No term pages, no sidebar chip:
categories are not a Hugo taxonomy.

Category is not a `sync_content.py` concern; the key passes through untouched.
