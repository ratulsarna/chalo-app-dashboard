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

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      // Best-effort terminate (SIGKILL fallback).
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
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
      if (stdout.length + stderr.length <= maxOutputBytes) return;
      child.kill("SIGTERM");
      safeReject(new Error(`Codex output exceeded ${maxOutputBytes} bytes`));
    }

    child.stdout.on("data", (d) => {
      stdout += d.toString("utf8");
      maybeAbortForOutput();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString("utf8");
      maybeAbortForOutput();
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
      `model_reasoning_effort="${reasoningEffort}"`,
      "--output-last-message",
      lastMessagePath,
      prompt,
    ];

    const { code, stdout, stderr } = await runCommand(codexBin, args, {
      cwd: dashboardRepoPath,
      env: process.env,
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
