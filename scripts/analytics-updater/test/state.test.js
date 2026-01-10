const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

const { createDefaultState, readState, writeStateAtomic } = require("../src/state.js");

test("readState returns defaults when file missing", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-"));
  const p = path.join(tmp, "state.json");
  const state = await readState(p);
  assert.deepEqual(state, createDefaultState());
});

test("writeStateAtomic writes JSON and readState reads it back", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-"));
  const p = path.join(tmp, "state.json");
  const input = { ...createDefaultState(), lastProcessedCommit: "abc123", lastRunStatus: "ok" };
  await writeStateAtomic(p, input);
  const out = await readState(p);
  assert.equal(out.lastProcessedCommit, "abc123");
  assert.equal(out.lastRunStatus, "ok");
});

test("readState throws with a clear error on corrupt JSON", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-"));
  const p = path.join(tmp, "state.json");
  await fs.writeFile(p, "{not json", "utf8");
  await assert.rejects(() => readState(p), /Failed to read state file/);
});
