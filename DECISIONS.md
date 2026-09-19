# Decisions

Why the build is shaped the way it is. `SPEC.md` describes **what** it does today; this file
holds the **reasoning**, so the two can diverge honestly — a decision can be overturned here
without anyone having to reverse-engineer the argument from the description.

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

---

## D1 — No PublicTxt.Syntax / .NET dependency

*Recorded 2026-09-19; decision predates this log.*

**Decision.** This repo builds a site from a plain Markdown wiki with relative links and no
front matter, with no .NET toolchain present. Hugo does everything it can natively; Python
preprocessing and client-side JS cover the rest.

**Why.** Keeps `publictxt-hugo` independently useful and testable, decouples the static-site
layer from the .NET solution's release cycle, and keeps authors' repos free of
generator-specific front matter.

**Revisit when.** Never for v1. If PublicTxt.Syntax ever ships as a portable, dependency-free
library, the preprocessing scripts become a candidate to replace — the site layer should not
be the reason that library can't be used.

---

## D2 — A sync step is unavoidable

*Recorded 2026-09-19; decision predates this log.*

**Decision.** The source repo is copied to `build/content/` and normalised there
(`scripts/sync_content.py`). The source is never modified.

**Why.** Hugo treats any folder containing `index.md` as a **leaf bundle**: sibling `.md`
files become page *resources* and are never rendered as pages. Real repos use `index.md` (and
`home.md`) as folder landing pages throughout. No Hugo configuration changes this — the file
must be renamed to `_index.md`. Once a copy step exists at all, deriving `title` and dates
there is cheaper and more robust than template-side workarounds, which could never fix sort
order anyway.

**Revisit when.** Hugo gains a way to treat `index.md` as a branch index. Nothing suggests it
will.

---

## D3 — Hashtag extraction is preprocessed, not native

*Recorded 2026-09-19; decision predates this log.*

**Decision.** `scripts/extract_hashtags.py` merges inline `#hashtags` into front matter `tags`
before Hugo runs.

**Why.** Hugo builds taxonomies from front matter *before* content rendering. Templates can
regex `.RawContent` to extract hashtags for display or for Pagefind filter attributes, but
cannot inject them into the taxonomy system — so native `/tags/foo/` pages and the tag cloud
would silently miss inline tags. Preprocessing gives one consistent tag source.

**Revisit when.** Hugo allows taxonomy terms to be contributed during rendering.

---

## D4 — Dates come from a ladder, not from build time

*Recorded 2026-09-19; decision predates this log.*

**Decision.** Every page gets both `created` and `updated`, resolved by `scripts/dates.py`
through the ladders in `SPEC.md`. The rung used is recorded as `created_source:`.

**Why.** Defaulting straight to build time stamps every undated page with the same,
ever-moving timestamp: undated wiki pages leapfrog genuinely dated posts on every rebuild and
"recent" becomes noise. Git history is the honest answer to both *when was this written* and
*when did it last change*; build time stays as the floor beneath it. `created_source:` exists
so a bad inference is visible in `build/content/` rather than silently wrong in a listing.

**Cost accepted.** Depends on real Git history — a shallow clone collapses the `git` rung to a
single timestamp. `deploy/publish-to-github-pages.yml` sets `fetch-depth: 0` and the sync step
warns when it sees a shallow repo.

**Revisit when.** Never, unless a cheaper honest source of authorship time appears.

---

## D5 — Standard Markdown links only; `[[wikilinks]]` unsupported in v1

*Recorded 2026-09-19; decision predates this log.*

**Decision.** Obsidian must emit relative Markdown links. `[[wikilink]]` syntax renders as
literal text.

**Why.** Hugo has no native support and upstream has declined to add it. Standard links also
stay valid when browsing the repo directly on GitHub/GitLab, which wikilinks do not.

**Cost accepted.** Real repos contain legacy wikilinks, and those pages render with visible
broken syntax.

**Revisit when.** Worth doing whenever someone has a repo where this actually bites — the sync
step already rewrites link destinations, so the hook exists. This is a small job, not a
blocked one.

---

## D6 — Browse lists are client-side over a JSON index

*Recorded 2026-09-19; decision predates this log. Shape revised by D7.*

**Decision.** Home *Recent*, section pages and tag pages render in the browser from a JSON
page index, with a server-rendered plain link list as the no-JS fallback.

**Why not Hugo pagination.** `.Paginate` fixes order and membership at build time, so a sort
toggle or a filter could only ever act on the current page.

**Why not Pagefind.** Its result ranking would replace deterministic ordering, and it needs
its index built — which doesn't exist under `hugo server` until a full build has run.

**Cost accepted.** Lists need JavaScript to be sortable and filterable; without it readers get
a plain, complete, unordered-by-preference link list.

**Revisit when.** Hugo gains client-side-queryable list output, or the corpus gets large
enough that shipping an index costs more than the interactivity is worth.

---

## D7 — One site-wide page index, not one per list page

*Recorded 2026-09-19. Revises the output shape of D6; its reasoning stands.*

**Decision.** The site publishes a single `index.json` (fingerprinted in production, URL on
`<html data-index>`). Each list page declares *which subset* it shows via `data-scope-kind` /
`data-scope-value`; `assets/js/site-index.js` resolves the scope client-side.

**Why.** The earlier shape emitted an `index.json` beside every list page, so a page's entry
was serialised once per list it appeared in — its section, every ancestor section, and every
one of its tags — and every navigation paid a fresh fetch. On the example repo that was 48
files and ~44KB carrying 24 distinct pages. One fingerprinted file is fetched once and reused
for the rest of the visit; the browser's HTTP cache handles invalidation because the URL
changes when the content does. The membership rules the templates already encode restate as
one-line client-side predicates, and four JSON layouts collapse into one partial.

**Cost accepted.** The first list rendered downloads the whole corpus rather than just its own
slice. The server-rendered `<ul>` is what the reader sees until it lands, so this is a
time-to-interactive cost, not a time-to-content one.

**Revisit when.** A corpus is large enough that the first-load cost is visible. The next step
is then sharding *this same format* by section — one loader, one item shape, a config knob —
not a second mechanism alongside it.

**What was wrong in the argument this replaced.** The per-list shape was defended on the
grounds that it kept payloads proportional to the page being viewed and that it invalidated
less on rebuild. The first is true but was outweighed: per-navigation fetches cost more across
a browsing session than one cached file does. The second was simply wrong — Hugo regenerates
everything on every build and static deploys push everything, so nothing was being saved.

---

## D8 — Custom Pagefind UI, not the stock one

*Recorded 2026-09-19; decision predates this log.*

**Decision.** `layouts/search.html` + `assets/js/search.js` drive the Pagefind JS API directly.

**Why.** Pagefind's stock UI cannot run filter-only searches, and browsing by tag combination
with no search term is a first-class use case here, not an edge case. Tag combinations are
AND-ed through Pagefind's multi-filter support because Hugo taxonomies cannot express
intersections at all.

**Revisit when.** The stock UI supports filter-only queries.

---

## D9 — Plain CSS, no Sass

*Recorded 2026-09-19; decision predates this log.*

**Decision.** `assets/css/main.css` is plain CSS with custom properties, through Hugo's asset
pipeline.

**Why.** Sass requires Hugo *extended*. Plain CSS means the smaller, more widely packaged
non-extended binary works, which matters for a tool people are meant to run against their own
repo with minimal setup.

**Revisit when.** Something genuinely needs Sass. Custom properties have covered theming so
far.

---

## D10 — Section order is configured, not derived

*Recorded 2026-09-19; decision predates this log.*

**Decision.** `params.sectionOrder` fixes sidebar and home-page section order; unlisted
sections follow alphabetically.

**Why.** Hugo's default page order is by date, which would reshuffle the site's primary
navigation on every content edit.

**Revisit when.** Never — navigation stability is the point.

---

## Not yet decided

Not a roadmap, and not an argument against doing any of these now. Each says why it hasn't
happened and what would change that.

| Thing | Why not yet | What would change it |
|---|---|---|
| `[[wikilink]]` conversion at sync time | No repo in hand where it bites; the sync step already has the hook (see D5) | Someone builds against a repo with legacy wikilinks |
| `author` / `source_repo` as active filters | Both are carried in front matter already. In a single-repo site their cardinality is 1, and the facet UI correctly hides facets that don't vary — so they'd render nothing | Multi-repo aggregation, or a repo with genuinely multiple authors. Cheap to add before then as shape-preparation, if that's the intent |
| Multi-repo subscription / fan-in | Aggregation is the upstream PublicTxt tool's job; this repo renders one content directory | A defined aggregate content model — at which point `source_repo` becomes load-bearing |
| Backlinks / graph view | The link graph is nearly free at sync time (link destinations are already parsed), but backlink *edges* don't belong in the list index — they're page-detail data, not filter/sort data (see D7) | Wanting "Linked from" on a page. Start with a per-page backlink count in the index and the edges in a separate page-scoped fetch |
| Link weights | No defined source. Authored per-edge weights won't realistically get populated; derived ones (multiplicity, reciprocity, position) would, but nothing yet needs the ordering they'd buy | Evidence that unweighted backlinks are insufficient in practice |
| Trust / reputation | No data source exists — no identity, voting or consensus layer. A network-derived score is an upstream PublicTxt concern, not a site-renderer one | A subscriber-declared source tier (`trusted` / `known` / `unverified`) in local subscription config would be shippable and is the honest v1 shape |
| Tag co-occurrence / relatedness | Was not expressible when each list page only saw its own slice; D7 makes it possible for the first time | Anyone wanting "related pages" — the data is now there |
