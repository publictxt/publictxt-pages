// cards.js: the remembered density, read from storage that may throw or be empty;
// tag URLs.
// Run: node --test "tests/js/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { readDense, tagURL } from "../../assets/js/cards.js";

const store = (v) => ({ getItem: () => v });

test("dense only when remembered so", () => {
  assert.equal(readDense(store("1")), true);
  assert.equal(readDense(store("0")), false);
  assert.equal(readDense(store(null)), false);
});

test("no storage, or storage that throws: full cards", () => {
  assert.equal(readDense(undefined), false);
  assert.equal(readDense({ getItem: () => { throw new Error("blocked"); } }), false);
});

test("tag URL: lower-cased, a nested tag's / as -- (hashtags.py tag_path)", () => {
  globalThis.document = { documentElement: { dataset: { base: "/sub" } } };
  try {
    assert.equal(tagURL("CoryDoctorow"), "/sub/tags/corydoctorow/");
    assert.equal(tagURL("dev/App"), "/sub/tags/dev--app/");
  } finally {
    delete globalThis.document;
  }
});

test("source rating: a minimum over forks; this repo's own pages never pass", async () => {
  const { sourceRatingPasses } = await import("../../assets/js/cards.js");
  const own = {}, unrated = { source: "a" }, four = { source: "b", sourceRating: 4 };
  assert.deepEqual([own, unrated, four].map((it) => sourceRatingPasses(it, "")), [true, true, true]);
  assert.deepEqual([own, unrated, four].map((it) => sourceRatingPasses(it, "4")), [false, false, true]);
  assert.deepEqual([own, unrated, four].map((it) => sourceRatingPasses(it, "5")), [false, false, false]);
  assert.deepEqual([own, unrated, four].map((it) => sourceRatingPasses(it, "unrated")), [false, true, false]);
});

test("source chip tooltip: repo, rating, description — what there is", async () => {
  const { sourceTitle } = await import("../../assets/js/cards.js");
  assert.equal(sourceTitle("ann", { repo: "github.com/ann/notes", rating: 4, description: "Ann's wiki." }),
    "ann — github.com/ann/notes\nSource rating ★★★★☆\nAnn's wiki.");
  assert.equal(sourceTitle("vault", { repo: "local repository", rating: 0, description: "" }), "vault — local repository");
});

test("a fork's arrival date reads \"forked\"", async () => {
  const { dateHTML } = await import("../../assets/js/cards.js");
  const it = { created: "2025-01-01T12:00:00Z", createdLabel: "1 Jan 2025" };
  assert.ok(!dateHTML(it).includes("forked"));
  assert.ok(dateHTML({ ...it, forked: true }).startsWith('<span class="muted">forked</span> <time'));
});
