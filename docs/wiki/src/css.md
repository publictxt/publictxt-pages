---
covers:
  - assets/css/main.css
---

# assets/css/main.css

One plain-CSS file, 594 lines, no preprocessor — the non-extended Hugo binary is enough
([D9](../decisions/D9.md)). Loaded by `head.html`, minified and fingerprinted with an
SRI hash in production only.

Banner comments mark the sections, in file order:

```txt
:root tokens       palette, --radius, --sidebar-width (264px), --content-max (76ch)
Header             sticky site header, logo, header search
Layout             the sidebar + content grid
Sidebar            side blocks, section list, meta list
Chips & tag cloud  .chip, .chip-type, .chip-link, .filter-chip, .tag-w1-4
Home               hero, .card-grid section cards
Breadcrumbs
Lists              .link-list (the no-JS fallback)
Browse lists       .page-card, .list-controls, .list-facet, .pagination
Single page        .prose, typography, code blocks, inline hashtags
Search page        .search-layout, filters column, result list
Responsive         the single breakpoint that collapses the sidebar
```

- **Theme by token.** The palette is custom properties on `:root`; retuning means
  editing that block, not the rules. Dark only — no light theme, no
  `prefers-color-scheme` branch.
- **Chips are one system.** `.chip` is the base; `-type`, `-link` and `.filter-chip`
  are modifiers. Server-rendered and JS-rendered markup emit the same classes, so a
  card looks identical before and after [list.js](js.md) swaps it.
- **Inline hashtags** are styled by attribute selector on their `/tags/` href, not a
  class — the sync step emits plain Markdown links and Goldmark adds no hook.
- **Chroma override.** Hugo's highlighter emits its own background on
  `.highlight pre`; it is overridden for consistency. Changing
  `markup.highlight.style` in [hugo.toml](config.md) may need this revisited.
