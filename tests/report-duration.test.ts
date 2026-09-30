import assert from "node:assert/strict";
import test from "node:test";
import { formatAverageDuration, formatDetailedDuration } from "../lib/report-duration";

test("shows minutes and seconds for ticket durations under one hour", () => {
  assert.equal(formatDetailedDuration(47 * 60_000 + 12_000), "47 นาที 12 วินาที");
  assert.equal(formatDetailedDuration(42_000), "0 นาที 42 วินาที");
});

test("shows only hours and minutes from one hour onward", () => {
  assert.equal(formatDetailedDuration(60 * 60_000 + 9 * 60_000 + 59_000), "1 ชม. 9 นาที");
  assert.equal(formatDetailedDuration(26 * 60 * 60_000 + 3 * 60_000), "26 ชม. 3 นาที");
});

test("keeps the existing rounded format for the average KPI", () => {
  assert.equal(formatAverageDuration(null), "—");
  assert.equal(formatAverageDuration(0.4), "1 ชม.");
  assert.equal(formatAverageDuration(1.4), "1 ชม.");
  assert.equal(formatAverageDuration(30), "1.3 วัน");
});
