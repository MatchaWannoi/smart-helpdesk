import assert from "node:assert/strict";
import test from "node:test";
import { isStrongPassword, normalizeRating } from "../lib/validation";

test("accepts passwords with at least eight characters, a letter, and a number", () => {
  assert.equal(isStrongPassword("Demo1234!"), true);
});

test("rejects passwords that do not meet the minimum policy", () => {
  assert.equal(isStrongPassword("short1"), false);
  assert.equal(isStrongPassword("onlyletters"), false);
  assert.equal(isStrongPassword("12345678"), false);
});

test("normalizes finite ratings to a whole number from one to five", () => {
  assert.equal(normalizeRating(1), 1);
  assert.equal(normalizeRating(3.6), 4);
  assert.equal(normalizeRating(5), 5);
});

test("rejects invalid or out-of-range ratings", () => {
  assert.equal(normalizeRating(0), null);
  assert.equal(normalizeRating(6), null);
  assert.equal(normalizeRating(Number.NaN), null);
  assert.equal(normalizeRating(Number.POSITIVE_INFINITY), null);
  assert.equal(normalizeRating("5"), null);
});
