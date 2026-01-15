import net from "node:net";
import { spawn } from "node:child_process";

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

  // If the caller already provided an explicit base URL, respect it and default to reusing
  // that server. Otherwise pick a free port and let Playwright start a fresh server.
  if (!env.E2E_BASE_URL) {
    const port = await findOpenPort();
    env.E2E_BASE_URL = `http://localhost:${port}`;
    env.E2E_REUSE_SERVER ??= "0";
  } else {
    env.E2E_REUSE_SERVER ??= "1";
  }

  const pnpmArgs = ["exec", "playwright", "test", ...args];
  const candidates = process.platform === "win32" ? ["pnpm.cmd", "pnpm"] : ["pnpm"];

  let exited = false;

  function attachExitForwarding(child) {
    child.on("exit", (code, signal) => {
      if (exited) return;
      exited = true;
      if (signal) process.kill(process.pid, signal);
      process.exit(code ?? 1);
    });
  }

  function spawnCandidate(index) {
    const cmd = candidates[index];
    const child = spawn(cmd, pnpmArgs, {
      stdio: "inherit",
      env,
      // pnpm is typically a .cmd shim on Windows; fall back to running via the shell if needed.
      shell: process.platform === "win32" && cmd === "pnpm",
      windowsHide: true,
    });

    attachExitForwarding(child);

    child.once("error", (err) => {
      if (
        process.platform === "win32" &&
        err?.code === "ENOENT" &&
        index + 1 < candidates.length
      ) {
        spawnCandidate(index + 1);
        return;
      }
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });

    return child;
  }

  spawnCandidate(0);
}

await main();
