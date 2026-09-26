# Decisions

[← Source wiki](../index.md)

Why the build is shaped the way it is. [docs/SPEC.md](../../SPEC.md) says **what** the site
should do and [docs/wiki/](../index.md) says **how** it works today; this file and the
records beside it hold the **reasoning**, so they can diverge honestly — a decision can be
overturned without anyone having to reverse-engineer the argument from the description.

## How to use this file

- A record's **authority is its argument**, never the fact that it is written down. If the
  reasoning no longer holds, the decision falls — no ceremony, no migration plan required.
- **Revisit when** is the important field. A record without one is a record nobody knows how
  to challenge.
- Records are append-mostly. When one is overturned, mark it superseded and write the new one
  rather than editing history.
- "Not yet decided" at the bottom is not a roadmap. Each entry says why it hasn't been done
  and what would change that. An entry there is not an argument against doing it now.

Dates are when the record was *written*. Most decisions predate this log; those are marked.

## Records

| # | Decision |
|---|---|
| [D1](D1.md) | No PublicTxt.Syntax / .NET dependency |
| [D2](D2.md) | A sync step is unavoidable |
| [D3](D3.md) | Hashtag extraction is preprocessed, not native |
| [D4](D4.md) | Dates come from a ladder, not from build time |
| [D5](D5.md) | Standard Markdown links only; `[[wikilinks]]` unsupported in v1 |
| [D6](D6.md) | Browse lists are client-side over a JSON index |
| [D7](D7.md) | One site-wide page index, not one per list page |
| [D8](D8.md) | Custom Pagefind UI, not the stock one |
| [D9](D9.md) | Plain CSS, no Sass |
| [D10](D10.md) | Section order is configured, not derived |
| [D11](D11.md) | Categories are a configured closed list, read from front matter |
| [D12](D12.md) | A page may have several categories |

---

## Not yet decided

Not a roadmap, and not an argument against doing any of these now. Each says why it hasn't
happened and what would change that.

| Thing | Why not yet | What would change it |
|---|---|---|
| `[[wikilink]]` conversion at sync time | No repo in hand where it bites; the sync step already has the hook (see [D5](D5.md)) | Someone builds against a repo with legacy wikilinks |
| `author` / `source_repo` as active filters | Both are carried in front matter already. In a single-repo site their cardinality is 1, and the facet UI correctly hides facets that don't vary — so they'd render nothing | Multi-repo aggregation, or a repo with genuinely multiple authors. Cheap to add before then as shape-preparation, if that's the intent |
| Multi-repo subscription / fan-in | Aggregation is the upstream PublicTxt tool's job; this repo renders one content directory | A defined aggregate content model — at which point `source_repo` becomes load-bearing |
| Backlinks / graph view | The link graph is nearly free at sync time (link destinations are already parsed), but backlink *edges* don't belong in the list index — they're page-detail data, not filter/sort data (see [D7](D7.md)) | Wanting "Linked from" on a page. Start with a per-page backlink count in the index and the edges in a separate page-scoped fetch |
| Link weights | No defined source. Authored per-edge weights won't realistically get populated; derived ones (multiplicity, reciprocity, position) would, but nothing yet needs the ordering they'd buy | Evidence that unweighted backlinks are insufficient in practice |
| Trust / reputation | No data source exists — no identity, voting or consensus layer. A network-derived score is an upstream PublicTxt concern, not a site-renderer one | A subscriber-declared source tier (`trusted` / `known` / `unverified`) in local subscription config would be shippable and is the honest v1 shape |
| Tag co-occurrence / relatedness | Was not expressible when each list page only saw its own slice; [D7](D7.md) makes it possible for the first time | Anyone wanting "related pages" — the data is now there |
