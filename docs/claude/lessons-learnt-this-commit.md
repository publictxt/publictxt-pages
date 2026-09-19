# Lessons — "Serve browse lists from one site-wide page index"

Notes to myself (Claude) from the session that produced commit `356587b`, written down because
the mistakes were process mistakes, not typos, and they'll recur otherwise.

Context: the session started as *plan an extension of search facets* (backlinks, link weight,
source repo, trust, author). It turned into a data-architecture change because my initial
objection to the facet plan rested on an analysis that was partly wrong. The user found the
holes. All four lessons below come from that.

---

## 1. Critique-by-citation is not critique

I argued against parts of the facet plan by pointing at `SPEC.md` — *"the spec already defers
this to v2"* — as though that settled something. But `SPEC.md` was written in earlier sessions,
largely by me, from reasoning with less information than we had in the conversation. Quoting it
back laundered a previous guess into a constraint.

The tell: the section I leaned on hardest, *"Deferred to v2+"*, was a bare list of conclusions
with no reasoning attached. That's exactly the shape that invites citation, because there's
nothing in it to evaluate. The sections that *did* carry arguments (the date ladders, "why a
sync step is unavoidable") were the ones I could have engaged with on the merits.

**Rule.** Cite the *argument*, never the fact that something is written down. If the argument
still holds it's load-bearing; if circumstances changed, the conclusion falls with no ceremony.
When a doc offers no argument, that's a gap in the doc, not authority.

This is why the repo now splits `SPEC.md` (description) from `DECISIONS.md` (reasoning, each
record with a **Revisit when**). A description that carries its own justification gets quoted
as a constraint.

## 2. I invented a layering rule and then defended it

I asserted that Hugo decides *membership* and JS decides *presentation*, and treated that line
as architectural. The user asked why JS couldn't just take the whole index and scope it per
page. It could. Every list on the site turned out to be a one-line predicate — a path prefix, a
tag test, a bookmark test, a sort-and-slice.

The rule wasn't a finding about the system; it was a description of how the code happened to be
arranged, promoted to a principle.

**Rule.** Before defending a boundary, check whether it's load-bearing or just incumbent. Ask:
what actually breaks if I move it? Here, nothing did.

## 3. I got the analysis backwards and asserted it confidently

Two specific errors, both stated as fact:

- *"Per-list JSON keeps payloads proportional to the page being viewed."* True in isolation,
  but I never compared it against the thing that mattered: per-list JSON costs **one fetch per
  navigation, forever**, while a single fingerprinted file costs **one fetch per build, per
  visitor**. Anyone browsing more than a couple of pages comes out ahead on the single file. I
  had the runtime math inverted.
- *"Per-list JSON invalidates less on rebuild."* Simply wrong. Hugo regenerates everything on
  every build and static deploys push everything. Nothing was being saved.

I also made byte and duplication claims from estimates ("roughly 300 bytes a page", "3–5×
blowup") while a `hugo` binary was one download away. When I finally measured: 48 files / ~44KB
carrying 24 distinct pages, which became 1 file / 9.2KB. The measurement supported the change —
but for different reasons than the ones I'd been arguing.

**Rule.** When a claim is cheap to measure, measure it before asserting it. And when comparing
two designs, name the metric that actually decides it — I compared payload size when the
deciding metric was fetches per session.

## 4. Diff the whole output, not the part you meant to change

Removing the `[outputs]` block from `hugo.toml` looked like pure deletion. It wasn't: listing
`["html", "json"]` had been *suppressing Hugo's default RSS output* as an unnoticed side
effect. Dropping the block started publishing `index.xml` for every section and term.

Nothing in the change description would have caught this. What caught it was diffing the full
published file set against a pre-change build and seeing `Only in public/blog: index.xml`.

**Rule.** For any refactor claiming "same output", snapshot the build first and diff
everything — file set included, not just the files you touched. Config blocks in particular
carry behaviour nobody wrote down.

Corollary that worked well: verifying equivalence *mechanically* rather than by inspection.
Reproducing all 48 former per-list JSON files from their page's declared scope, and checking
all 110 item objects byte-for-byte against the global index, took one short script and turned
"should be identical" into "is identical". Cheap, and it's what made the deletion safe.

---

## What to carry forward

- The user's framing — spec as *current best understanding*, not contract — is the right one,
  and it applies to every doc in this repo that I generated.
- Being asked to be "productively critical" pushed me toward *finding objections*, and the
  cheapest objections to reach for were ones already written down. Critique that costs nothing
  to produce is usually worth what it cost.
- Two of my three technical objections were wrong. Conceding them quickly and moving to the
  better design cost nothing; defending them would have cost the change.

## Note on this file's name

`lessons-learnt-this-commit.md` won't age well — the next commit's lessons have nowhere to go
without overwriting these. If this becomes a habit, `docs/claude/lessons/<date>-<slug>.md`
would keep them as a series.
