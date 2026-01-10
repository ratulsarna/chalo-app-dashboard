const fs = require("node:fs/promises");
const path = require("node:path");

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createDefaultState() {
  return {
    lastProcessedCommit: null,
    lastRunAt: null,
    lastRunStatus: null,
    lastPRUrl: null,
  };
}

async function readState(statePath) {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return createDefaultState();

    return {
      ...createDefaultState(),
      ...parsed,
    };
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return createDefaultState();
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read state file (${statePath}): ${message}`);
  }
}

async function writeStateAtomic(statePath, state) {
  const dir = path.dirname(statePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${statePath}.tmp`;
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  await fs.writeFile(tmpPath, payload, "utf8");
  try {
    await fs.rename(tmpPath, statePath);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : null;
    if (code !== "EEXIST" && code !== "EPERM") throw err;
    // Best-effort fallback for Windows-like semantics where rename may fail if destination exists.
    await fs.rm(statePath, { force: true });
    await fs.rename(tmpPath, statePath);
  }
}

module.exports = { createDefaultState, readState, writeStateAtomic };
