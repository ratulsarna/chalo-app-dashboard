const fs = require("node:fs/promises");
const path = require("node:path");

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : null;
    if (code === "EPERM") return true;
    return false;
  }
}

async function isLockStale(lockPath) {
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw);
    const pid = parsed && typeof parsed === "object" && "pid" in parsed ? parsed.pid : null;
    if (!Number.isInteger(pid)) return true;
    return !(await isProcessRunning(pid));
  } catch {
    return true;
  }
}

async function acquireLock(lockPath, { force = false } = {}) {
  await ensureDir(lockPath);
  if (force) {
    await fs.unlink(lockPath).catch(() => {});
  }

  const payload = `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await fs.writeFile(lockPath, payload, { encoding: "utf8", flag: "wx" });
      return;
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : null;
      if (code !== "EEXIST") {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to acquire lock (${lockPath}): ${message}`);
      }

      const stale = await isLockStale(lockPath);
      if (!stale) throw new Error(`Lock already held: ${lockPath}`);
      await fs.unlink(lockPath).catch(() => {});
    }
  }

  throw new Error(`Lock already held: ${lockPath}`);
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
