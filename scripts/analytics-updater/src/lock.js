const fs = require("node:fs/promises");
const path = require("node:path");

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function acquireLock(lockPath) {
  await ensureDir(lockPath);
  try {
    const payload = `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`;
    await fs.writeFile(lockPath, payload, { encoding: "utf8", flag: "wx" });
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : null;
    if (code === "EEXIST") {
      throw new Error(`Lock already held: ${lockPath}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to acquire lock (${lockPath}): ${message}`);
  }
}

async function releaseLock(lockPath) {
  try {
    await fs.unlink(lockPath);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : null;
    if (code === "ENOENT") return;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to release lock (${lockPath}): ${message}`);
  }
}

module.exports = { acquireLock, releaseLock };
