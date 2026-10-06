// page-size.js: the remembered page size, the select's choices, keeping place.
// Run: node --test "tests/js/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { pageHolding, pageSizes, readPageSize, writePageSize } from "../../assets/js/page-size.js";

const store = (v) => ({ getItem: () => v });

test("a remembered size, 0 = all", () => {
  assert.equal(readPageSize(store("50")), 50);
  assert.equal(readPageSize(store("0")), 0);
});

test("nothing remembered, junk, or storage that throws: the list's default", () => {
  for (const v of [null, "", "abc", "-5", "2.5"]) assert.equal(readPageSize(store(v)), null, v);
  assert.equal(readPageSize(undefined), null);
  assert.equal(readPageSize({ getItem: () => { throw new Error("blocked"); } }), null);
});

test("writing to storage that throws doesn't", () => {
  writePageSize({ setItem: () => { throw new Error("blocked"); } }, 20);
  const saved = {};
  writePageSize({ setItem: (k, v) => { saved[k] = v; } }, 0);
  assert.deepEqual(Object.values(saved), ["0"]);
});

test("choices: the fixed set plus the list's default and the size in use, all last", () => {
  assert.deepEqual(pageSizes(20, 20), [10, 20, 50, 0]);
  assert.deepEqual(pageSizes(8, 0), [8, 10, 20, 50, 0]);
  assert.deepEqual(pageSizes(30, 8), [8, 10, 20, 30, 50, 0]);
});

test("a new size keeps the first card shown on screen", () => {
  assert.equal(pageHolding(0, 20), 1);
  assert.equal(pageHolding(40, 20), 3);    // page 3 at 20 starts at 40
  assert.equal(pageHolding(40, 50), 1);
  assert.equal(pageHolding(40, 10), 5);
  assert.equal(pageHolding(40, 0), 1);     // all
});
