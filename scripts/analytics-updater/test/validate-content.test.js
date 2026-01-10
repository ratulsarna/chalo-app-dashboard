const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { validateAnalyticsContent } = require("../src/validate-content.js");

test("validateAnalyticsContent passes minimal fixture", async () => {
  const repoRoot = path.join(__dirname, "..", "__fixtures__", "minimal-flow");
  const result = await validateAnalyticsContent(repoRoot);
  assert.equal(result.ok, true);
});

test("validateAnalyticsContent fails invalid JSON fixture", async () => {
  const repoRoot = path.join(__dirname, "..", "__fixtures__", "invalid-json");
  const result = await validateAnalyticsContent(repoRoot);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.code === "invalid_json"));
});

test("validateAnalyticsContent fails when a referenced flow is missing events.json", async () => {
  const repoRoot = path.join(__dirname, "..", "__fixtures__", "missing-events-json");
  const result = await validateAnalyticsContent(repoRoot);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.code === "missing_events_json"));
});
