// cards.js: the remembered density, read from storage that may throw or be empty.
// Run: node --test "tests/js/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { readDense } from "../../assets/js/cards.js";

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
