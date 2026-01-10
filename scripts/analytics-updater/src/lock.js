const fs = require("node:fs/promises");
const path = require("node:path");

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function acquireLock(lockPath) {
  await ensureDir(lockPath);
  try {
    const handle = await fs.open(lockPath, "wx");
    const payload = `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`;
    await handle.writeFile(payload, "utf8");
    await handle.close();
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
