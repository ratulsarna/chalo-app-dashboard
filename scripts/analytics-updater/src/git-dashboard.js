const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function git(args, { cwd }) {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

async function getStatusPorcelain(repoPath) {
  return await git(["status", "--porcelain"], { cwd: repoPath });
}

async function hasRemoteBranch(repoPath, remote, branch) {
  const out = await git(["ls-remote", "--heads", remote, branch], { cwd: repoPath });
  return out.trim().length > 0;
}

async function checkoutBaseAndPull(repoPath, baseBranch) {
  await git(["checkout", baseBranch], { cwd: repoPath });

  const remote = "origin";
  const remoteExists = await hasRemoteBranch(repoPath, remote, baseBranch);
  if (!remoteExists) return;

  await git(["pull", "--ff-only", remote, baseBranch], { cwd: repoPath });
}

async function checkoutOrCreateBranch(repoPath, branch) {
  await git(["checkout", "-B", branch], { cwd: repoPath });
}

async function commitAll(repoPath, message) {
  await git(["add", "-A"], { cwd: repoPath });
  const status = await getStatusPorcelain(repoPath);
  if (status.length === 0) return false;
  await git(["commit", "-m", message], { cwd: repoPath });
  return true;
}

async function pushBranch(repoPath, branch) {
  await git(["push", "-u", "origin", branch, "--force-with-lease"], { cwd: repoPath });
}

module.exports = { getStatusPorcelain, checkoutBaseAndPull, checkoutOrCreateBranch, commitAll, pushBranch };
