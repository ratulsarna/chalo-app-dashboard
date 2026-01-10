const test = require("node:test");
const assert = require("node:assert/strict");

// This module does not exist yet; tests should fail until Milestone 3 is implemented.
const { computeUpdateBranchName, shouldRunForHead } = require("../src/orchestrator.js");

test("computeUpdateBranchName is deterministic", () => {
  assert.equal(computeUpdateBranchName("abc123"), "autoupdate/analytics/abc123");
});

test("shouldRunForHead returns false when unchanged", () => {
  assert.equal(shouldRunForHead({ lastProcessedCommit: "abc" }, "abc"), false);
});

test("shouldRunForHead returns true when new head exists", () => {
  assert.equal(shouldRunForHead({ lastProcessedCommit: "abc" }, "def"), true);
});

