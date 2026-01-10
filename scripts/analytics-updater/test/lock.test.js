const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

const { acquireLock, releaseLock } = require("../src/lock.js");

test("acquireLock creates a lock; second acquire fails; release clears it", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-"));
  const lockPath = path.join(tmp, "lock");

  await acquireLock(lockPath);
  await assert.rejects(() => acquireLock(lockPath), /Lock already held/);
  await releaseLock(lockPath);
  await acquireLock(lockPath);
  await releaseLock(lockPath);
});
