const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function git(args, { cwd }) {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

async function ensureCleanWorktree(repoPath) {
  const out = await git(["status", "--porcelain"], { cwd: repoPath });
  if (out.length > 0) throw new Error(`Repo has uncommitted changes: ${repoPath}`);
}

async function checkoutBranch(repoPath, branch) {
  await git(["checkout", branch], { cwd: repoPath });
}

async function checkoutOrCreateBranch(repoPath, branch) {
  await git(["checkout", "-B", branch], { cwd: repoPath });
}

async function pullFFOnly(repoPath) {
  await git(["pull", "--ff-only"], { cwd: repoPath });
}

async function fetch(repoPath) {
  await git(["fetch", "--all", "--prune"], { cwd: repoPath });
}

async function revParse(repoPath, ref) {
  return await git(["rev-parse", ref], { cwd: repoPath });
}

async function diffNameStatus(repoPath, range) {
  return await git(["diff", "--name-status", range], { cwd: repoPath });
}

module.exports = {
  ensureCleanWorktree,
  checkoutBranch,
  checkoutOrCreateBranch,
  pullFFOnly,
  fetch,
  revParse,
  diffNameStatus,
};
