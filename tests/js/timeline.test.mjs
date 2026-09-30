// timeline.js: grouping by year and month — from pages and from Pagefind's
// month counts — and the ?month= spelling.
// Run: node --test "tests/js/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { countsTree, monthCount, monthFilter, monthOf, timeline } from "../../assets/js/timeline.js";

const page = (created, title = created) =>
  ({ title, created, year: created.slice(0, 4), createdLabel: "label" });

test("years and months newest first, pages newest first within a month", () => {
  const tree = timeline([
    page("2017-02-03T00:00:00Z", "a"), page("2018-01-01T00:00:00Z", "b"),
    page("2017-10-09T00:00:00Z", "c"), page("2017-02-20T00:00:00Z", "d"),
  ]);
  assert.deepEqual(tree.map((y) => [y.year, y.count]), [["2018", 1], ["2017", 3]]);
  assert.deepEqual(tree[1].months.map((m) => [m.month, m.count]), [["10", 1], ["02", 2]]);
  assert.deepEqual(tree[1].months[1].items.map((it) => it.title), ["d", "a"]);
  assert.equal(monthCount(tree), 3);
});

test("the month is created's own digits, not the reader's zone", () => {
  // 23:30 on the 31st, 10 hours ahead of UTC: still October wherever it's read.
  assert.equal(monthOf(page("2017-10-31T23:30:00+10:00")), "10");
});

test("undated pages are left out", () => {
  const undated = { ...page("0001-01-01T00:00:00Z"), createdLabel: "" };
  assert.deepEqual(timeline([undated]), []);
});

test("?month= needs a year and a real month", () => {
  assert.equal(monthFilter("10", "2017"), "10");
  assert.equal(monthFilter("10", ""), "");
  assert.equal(monthFilter("13", "2017"), "");
  assert.equal(monthFilter("7", "2017"), "");
});

test("Pagefind month counts make the same tree, less empty and undated months", () => {
  const tree = countsTree({ "2017-02": 2, "2018-01": 1, "2017-10": 1, "2017-07": 0, "0001-01": 5, junk: 1 });
  assert.deepEqual(tree.map((y) => [y.year, y.count]), [["2018", 1], ["2017", 3]]);
  assert.deepEqual(tree[1].months.map((m) => [m.month, m.count]), [["10", 1], ["02", 2]]);
  assert.deepEqual(countsTree(undefined), []);
});
