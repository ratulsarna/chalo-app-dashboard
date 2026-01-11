const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

function runCommand(
  bin,
  args,
  { cwd, env, timeoutMs = 30 * 60 * 1000, maxOutputBytes = 50 * 1024 * 1024 },
) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    let totalBytes = 0;
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      // Best-effort terminate (SIGKILL fallback).
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
      safeReject(new Error(`Codex command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
    }

    function safeReject(err) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    }

    function maybeAbortForOutput() {
      if (totalBytes <= maxOutputBytes) return;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
      safeReject(new Error(`Codex output exceeded ${maxOutputBytes} bytes`));
    }

    child.stdout.on("data", (d) => {
      if (settled) return;
      totalBytes += d.length;
      maybeAbortForOutput();
      if (settled) return;
      stdoutChunks.push(d);
    });
    child.stderr.on("data", (d) => {
      if (settled) return;
      totalBytes += d.length;
      maybeAbortForOutput();
      if (settled) return;
      stderrChunks.push(d);
    });
    child.on("error", (err) => safeReject(err));
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      cleanup();

      if (signal) {
        reject(new Error(`Codex process terminated by signal ${signal}`));
        return;
      }
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      resolve({ code, stdout, stderr });
    });
  });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs Codex in non-interactive mode to update content/analytics/** based on the upstream diff.
 *
 * Returns: { ok, summary, rawStdout, rawStderr }
 */
async function runCodexUpdater({
  codexBin,
  model,
  reasoningEffort,
  dashboardRepoPath,
  upstreamRepoPath,
  baseSha,
  headSha,
  instructionsPath,
  upstreamBranch,
}) {
  async function assertAbsoluteDirExists(label, p) {
    if (!path.isAbsolute(p)) throw new Error(`${label} must be an absolute path: ${p}`);
    const stat = await fs.stat(p);
    if (!stat.isDirectory()) throw new Error(`${label} is not a directory: ${p}`);
  }

  async function assertAbsoluteFileExists(label, p) {
    if (!path.isAbsolute(p)) throw new Error(`${label} must be an absolute path: ${p}`);
    const stat = await fs.stat(p);
    if (!stat.isFile()) throw new Error(`${label} is not a file: ${p}`);
  }

  const safeReasoningEffort = String(reasoningEffort || "")
    .trim()
    .toLowerCase();
  if (!["low", "medium", "high"].includes(safeReasoningEffort)) {
    throw new Error(`Invalid codex reasoning effort: ${String(reasoningEffort)}`);
  }

  await assertAbsoluteDirExists("dashboardRepoPath", dashboardRepoPath);
  await assertAbsoluteDirExists("upstreamRepoPath", upstreamRepoPath);
  await assertAbsoluteFileExists("instructionsPath", instructionsPath);

  // Reduce secret exposure to the Codex subprocess.
  const rawEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    TMPDIR: process.env.TMPDIR,
  };
  const env = Object.fromEntries(Object.entries(rawEnv).filter(([, v]) => v !== undefined));

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-codex-"));
  const lastMessagePath = path.join(tmpDir, "codex-last-message.md");

  try {
    const prompt = [
      `You are in ${dashboardRepoPath}.`,
      ``,
      `Read the instructions in ${instructionsPath} and do exactly what it says.`,
      ``,
      `Upstream repo: ${upstreamRepoPath} (branch: ${upstreamBranch || "main"})`,
      `Commit range to process: ${baseSha}..${headSha}`,
      ``,
      `At the end, output a PR-ready run summary as your final message.`,
    ].join("\n");

    const args = [
      "exec",
      // Non-interactive automation: allow safe auto-execution while keeping filesystem access constrained.
      "--full-auto",
      "--sandbox",
      "workspace-write",
      "-C",
      dashboardRepoPath,
      "--add-dir",
      upstreamRepoPath,
      "--model",
      model,
      "-c",
      `model_reasoning_effort="${safeReasoningEffort}"`,
      "--output-last-message",
      lastMessagePath,
      prompt,
    ];

    const { code, stdout, stderr } = await runCommand(codexBin, args, {
      cwd: dashboardRepoPath,
      env,
    });

    let summary = "";
    if (await fileExists(lastMessagePath)) {
      summary = (await fs.readFile(lastMessagePath, "utf8")).trim();
    }

    return {
      ok: code === 0,
      summary,
      rawStdout: stdout,
      rawStderr: stderr,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { runCodexUpdater };
