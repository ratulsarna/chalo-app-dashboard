const path = require("node:path");

const { defaultLockPath, defaultStatePath } = require("./paths.js");

function readBoolEnv(value) {
  if (value === undefined) return undefined;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
}

function parseArgs(argv) {
  const out = { dryRun: false, init: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    if (arg === "--init") out.init = true;
  }
  return out;
}

function resolveConfig({ argv = process.argv.slice(2), env = process.env } = {}) {
  const args = parseArgs(argv);

  const upstreamRepoPath = env.UPSTREAM_REPO_PATH ?? "/home/ratul/Developer/chalo/chalo-app-kmp";
  const upstreamBranch = env.UPSTREAM_BRANCH ?? "main";
  const dashboardRepoPath = env.DASHBOARD_REPO_PATH ?? "/home/ratul/Developer/chalo/chalo-app-dashboard";
  const dashboardBaseBranch = env.DASHBOARD_BASE_BRANCH ?? "main";

  const instructionsPath = env.CODEX_INSTRUCTIONS_PATH ?? path.join(dashboardRepoPath, ".ai", "codex", "analytics-updater.md");

  const statePath = env.STATE_PATH ?? defaultStatePath();
  const lockPath = env.LOCK_PATH ?? defaultLockPath();

  const codexBin = env.CODEX_BIN ?? "codex";
  const codexModel = env.CODEX_MODEL ?? "gpt-5.2";
  const codexReasoningEffort = env.CODEX_REASONING_EFFORT ?? "high";

  const dryRun = args.dryRun || readBoolEnv(env.DRY_RUN) === true;

  return {
    dryRun,
    init: args.init,
    upstreamRepoPath,
    upstreamBranch,
    dashboardRepoPath,
    dashboardBaseBranch,
    instructionsPath,
    statePath,
    lockPath,
    codexBin,
    codexModel,
    codexReasoningEffort,
  };
}

module.exports = { resolveConfig };
