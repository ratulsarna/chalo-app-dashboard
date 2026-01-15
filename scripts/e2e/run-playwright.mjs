import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

async function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findOpenPort(start = 3100, end = 3999) {
  for (let port = start; port <= end; port++) {
    if (await canListen(port)) return port;
  }
  throw new Error(`No open port found in range ${start}-${end}.`);
}

async function main() {
  const args = process.argv.slice(2);
  const env = { ...process.env };

  const devLockPath = path.join(process.cwd(), ".next", "dev", "lock");
  fs.mkdirSync(path.dirname(devLockPath), { recursive: true });
  fs.closeSync(fs.openSync(devLockPath, "a"));
  const lockProbe = spawnSync("flock", ["-n", devLockPath, "-c", "true"], { stdio: "ignore" });
  const devServerRunning = lockProbe.status !== 0;

  // If the caller already provided an explicit base URL, respect it. Otherwise:
  // - If a dev server for this repo is already running, reuse it (avoid Next dev lock errors).
  // - Else, pick a free port and let Playwright boot a fresh server.
  if (!env.E2E_BASE_URL) {
    if (devServerRunning) {
      env.E2E_BASE_URL = "http://localhost:3000";
      env.E2E_REUSE_SERVER = env.E2E_REUSE_SERVER ?? "1";
    } else {
      const port = await findOpenPort();
      env.E2E_BASE_URL = `http://localhost:${port}`;
      env.E2E_REUSE_SERVER = env.E2E_REUSE_SERVER ?? "0";
    }
  } else {
    env.E2E_REUSE_SERVER = env.E2E_REUSE_SERVER ?? "1";
  }

  const child = spawn("pnpm", ["exec", "playwright", "test", ...args], {
    stdio: "inherit",
    env,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

await main();
