const test = require("node:test");
const assert = require("node:assert/strict");

const { computeUpdateBranchName, shouldRunForHead } = require("../src/orchestrator.js");

test("computeUpdateBranchName is deterministic", () => {
  assert.equal(computeUpdateBranchName("abc1234"), "autoupdate/analytics/abc1234");
});

test("shouldRunForHead returns false when unchanged", () => {
  assert.equal(shouldRunForHead({ lastProcessedCommit: "abc" }, "abc"), false);
});

test("shouldRunForHead returns true when new head exists", () => {
  assert.equal(shouldRunForHead({ lastProcessedCommit: "abc" }, "def"), true);
});
