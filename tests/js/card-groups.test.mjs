// card-groups.js: how a sort groups cards (keys a list counts and Pagefind's
// month filter sizes), and a group's count. Building groups needs a DOM; the
// browser covers that.
// Run: node --test "tests/js/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { countBy, grouper, groupCount } from "../../assets/js/card-groups.js";

test("a date sort groups by that date's month, as written; title doesn't group", () => {
  const it = { created: "2026-09-30T23:30:00-05:00", updated: "2026-10-01T09:00:00Z" };
  assert.equal(grouper("created")(it), "2026-09", "the page's own month, not UTC's");
  assert.equal(grouper("updated asc")(it), "2026-10");
  assert.equal(grouper("created")({ created: "0001-01-01T00:00:00Z" }), "", "Hugo's zero date: undated");
  assert.equal(grouper("created")({}), "");
  assert.equal(grouper("title"), null);
});

test("a rating sort groups by stars, unrated where it sorts", () => {
  assert.equal(grouper("rating")({ rating: 4 }), "4");
  assert.equal(grouper("rating asc")({ rating: 1 }), "1");
  assert.equal(grouper("rating")({}), "", "unrated: no value");
});

test("countBy: each key's count", () => {
  const items = [5, 3, undefined, undefined, 2].map((rating) => ({ rating }));
  assert.deepEqual([...countBy(items, grouper("rating"))], [["5", 1], ["3", 1], ["", 2], ["2", 1]]);
  assert.equal(countBy([], grouper("rating")).size, 0);
});

test("groupCount: all shown, some shown, total unknown", () => {
  assert.equal(groupCount(9, 9), "9 pages");
  assert.equal(groupCount(1, 1), "1 page");
  assert.equal(groupCount(4, 9), "4 of 9 pages");
  assert.equal(groupCount(3, undefined), "", "updated: Pagefind has no count");
});
