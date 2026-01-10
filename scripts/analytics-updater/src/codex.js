const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

function runCommand(bin, args, { cwd, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString("utf8");
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString("utf8");
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
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
}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-codex-"));
  const lastMessagePath = path.join(tmpDir, "codex-last-message.md");

  const prompt = [
    `You are in ${dashboardRepoPath}.`,
    ``,
    `Read the instructions in ${instructionsPath} and do exactly what it says.`,
    ``,
    `Upstream repo: ${upstreamRepoPath} (branch: main)`,
    `Commit range to process: ${baseSha}..${headSha}`,
    ``,
    `IMPORTANT: Do not navigate away from the current page in the dashboard UI — only update content files. (This is a docs update run.)`,
    ``,
    `At the end, output a PR-ready run summary as your final message.`,
  ].join("\n");

  const args = [
    "exec",
    "--dangerously-bypass-approvals-and-sandbox",
    "--sandbox",
    "danger-full-access",
    "-C",
    dashboardRepoPath,
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
}

module.exports = { runCodexUpdater };

