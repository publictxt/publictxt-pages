// timeline.js: grouping by year and month — from pages and from Pagefind's
// month counts — the ?month= spelling, and an archive's tag chips.
// Run: node --test "tests/js/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { countsTree, dayOf, monthCount, monthFilter, monthOf, splittingTags, timeline } from "../../assets/js/timeline.js";

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
  assert.equal(dayOf(page("2017-10-31T23:30:00+10:00")), "31");
  assert.equal(dayOf(page("2017-10-05T00:00:00Z")), "5");
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

test("tag chips: only tags that split the dated pages, in config order, the pages' spelling", () => {
  const tagged = (created, tags) => ({ ...page(created), tags });
  const items = [
    tagged("2020-01-01T00:00:00Z", ["Journal", "all"]),
    tagged("2020-02-01T00:00:00Z", ["all"]),
    { ...tagged("0001-01-01T00:00:00Z", ["undated"]), createdLabel: "" },
  ];
  assert.deepEqual(splittingTags(items, ["all", "none", "journal"]), ["Journal"]);
  assert.deepEqual(splittingTags(items, ["undated"]), []);
  assert.deepEqual(splittingTags([page("2020-01-01T00:00:00Z")], ["journal"]), []);
});
