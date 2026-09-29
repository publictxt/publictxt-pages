// facets.js and sorts.js: the URL spelling shared links depend on, chip
// presses, and lists (matches) agreeing with search (pagefindConditions).
// Run: node --test "tests/js/*.test.mjs"   (Node 22+, which reads these .js files as ES
// modules without a package.json; no packages)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addsPages, chipFacets, describe, matches, pagefindConditions, press, readFacet, toggleInclude, writeFacet,
} from "../../assets/js/facets.js";
import { normaliseSort, parseSort, sortLabel } from "../../assets/js/sorts.js";

const qs = (s) => new URLSearchParams(s);
const url = (f) => { const p = new URLSearchParams(); writeFacet(p, f); return p.toString(); };
const facet = (s = "", states, modes) => readFacet(qs(s), "tag", states, modes);

// ---- URL ----------------------------------------------------------------

test("URL round trip: includes, excludes, match", () => {
  const s = "tag=a&tag=b&tag-not=c&tag-match=any";
  const f = facet(s);
  assert.deepEqual([...f.inc], ["a", "b"]);
  assert.deepEqual([...f.exc], ["c"]);
  assert.equal(f.match, "any");
  assert.equal(url(f), s);
});

test("-match is left out at the facet's default, modes[0]", () => {
  assert.equal(url(facet("tag=a&tag-match=all")), "tag=a");
  assert.equal(url(facet("tag=a", undefined, ["any", "all"])), "tag=a");
  assert.equal(url(facet("tag=a&tag-match=all", undefined, ["any", "all"])), "tag=a&tag-match=all");
});

test("config beats the URL: disallowed states and modes are dropped", () => {
  const f = facet("tag=a&tag-not=b&tag-match=all", ["include"], ["any"]);
  assert.deepEqual([...f.exc], []);   // no ✕ to clear it, so never set
  assert.equal(f.match, "any");
  assert.equal(facet("tag=a&tag-match=nonsense").match, "all");
  assert.deepEqual([...facet("tag=&tag=a").inc], ["a"]);
});

test("chipFacets: config order, unknown keys dropped, defaults filled", () => {
  const c = chipFacets([
    { key: "tag", label: "Tags" },
    { key: "bogus" },
    { key: "collection", label: "Collection", states: ["include", "nope"], match: ["any"] },
  ]);
  assert.deepEqual(c.keys, ["tag", "collection"]);
  const [tag, col] = c.defs;
  assert.deepEqual([tag.states, tag.modes, tag.prefix, tag.item], [["include", "exclude"], ["all", "any"], "#", "tags"]);
  assert.deepEqual([col.states, col.modes, col.shared], [["include"], ["any"], true]);

  const s = c.read(qs("tag=a&collection=blog&collection-not=wiki"));
  assert.deepEqual([...s.collection.exc], []);   // collection can't exclude here
  assert.ok(c.anySet(s));
  assert.deepEqual(c.describe(s), ["#a", "blog"]);
  const p = new URLSearchParams(); c.write(p, s);
  assert.equal(p.toString(), "tag=a&collection=blog");
  c.clear(s);
  assert.ok(!c.anySet(s));
});

// ---- chips --------------------------------------------------------------

test("press: body toggles the first state; ✕ toggles exclude; never via the opposite", () => {
  const f = facet();
  press(f, "a");        assert.ok(f.inc.has("a"));
  press(f, "a");        assert.ok(!f.inc.has("a") && !f.exc.has("a"));
  press(f, "a", true);  assert.ok(f.exc.has("a"));
  press(f, "a");        assert.ok(!f.inc.has("a") && !f.exc.has("a"));   // body clears, doesn't include
  press(f, "a");        press(f, "a", true);
  assert.ok(f.exc.has("a") && !f.inc.has("a"));                          // included -> ✕ -> excluded
  const exOnly = facet("", ["exclude"]);
  press(exOnly, "b");   assert.ok(exOnly.exc.has("b"));
});

test("toggleInclude (card tags) never excludes, and lifts an exclude", () => {
  const f = facet("tag-not=a");
  toggleInclude(f, "a");
  assert.ok(f.inc.has("a") && !f.exc.has("a"));
  toggleInclude(f, "a");
  assert.equal(f.inc.size + f.exc.size, 0);
});

test("describe: status line parts", () => {
  assert.deepEqual(describe(facet("tag=a&tag=b&tag-not=c"), "#"), ["#a · #b", "not #c"]);
  assert.deepEqual(describe(facet("tag=a&tag=b&tag-match=any"), "#"), ["#a or #b"]);
});

test("addsPages: only an `any` facet with includes", () => {
  assert.ok(addsPages(facet("tag=a&tag-match=any")));
  assert.ok(!addsPages(facet("tag=a")));
  assert.ok(!addsPages(facet("tag-match=any")));
});

// ---- lists and search agree ---------------------------------------------

// Pagefind's filter semantics, as documented: a bare array = all of, { any },
// { none }; conditions in `all: [...]` all hold.
function pagefindMatches(conditions, values) {
  return conditions.every((c) => {
    const want = Object.values(c)[0];
    if (Array.isArray(want)) return want.every((v) => values.includes(v));
    if (want.any) return want.any.some((v) => values.includes(v));
    if (want.none) return !want.none.some((v) => values.includes(v));
    throw new Error("unknown condition " + JSON.stringify(c));
  });
}

test("matches() and pagefindConditions() agree on every combination", () => {
  const vals = ["a", "b", "c"];
  const pages = [[], ["a"], ["b"], ["a", "b"], ["c"], ["a", "c"], ["a", "b", "c"]];
  let checked = 0;
  for (let mask = 0; mask < 3 ** vals.length; mask++) {
    const parts = vals.map((v, i) => [v, Math.floor(mask / 3 ** i) % 3]);   // 0 off, 1 include, 2 exclude
    for (const match of ["all", "any"]) {
      const f = facet(parts.map(([v, s]) => (s === 1 ? `tag=${v}` : s === 2 ? `tag-not=${v}` : "")).filter(Boolean)
        .join("&") + `&tag-match=${match}`);
      for (const own of [true, false]) {
        const conds = pagefindConditions(f, own);
        for (const page of pages) {
          assert.equal(matches(f, page, own), pagefindMatches(conds, page),
            `${url(f)} own=${own} page=[${page}]`);
          checked++;
        }
      }
    }
  }
  assert.equal(checked, 27 * 2 * 2 * pages.length);
});

// ---- sorts --------------------------------------------------------------

test("sorts: canonical URL form omits the natural direction", () => {
  assert.equal(normaliseSort(""), "created");
  assert.equal(normaliseSort("created desc"), "created");
  assert.equal(normaliseSort("TITLE"), "title");
  assert.equal(normaliseSort("title desc"), "title desc");
  assert.equal(normaliseSort("rating asc"), "rating asc");
  assert.equal(normaliseSort("bogus"), "created");
  assert.deepEqual(parseSort("title"), { field: "title", dir: "asc" });
  assert.deepEqual(parseSort("updated"), { field: "updated", dir: "desc" });
  assert.equal(sortLabel("created asc"), "Oldest");
});
