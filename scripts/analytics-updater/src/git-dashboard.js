const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function git(args, { cwd }) {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

function parseWorktreeListPorcelain(out) {
  const worktrees = [];
  let current = null;

  for (const rawLine of String(out || "").split("\n")) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    if (line.startsWith("worktree ")) {
      if (current) worktrees.push(current);
      current = { path: line.slice("worktree ".length).trim(), branch: null, head: null, detached: false };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("branch ")) {
      const ref = line.slice("branch ".length).trim();
      current.branch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref;
      continue;
    }

    if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length).trim();
      continue;
    }

    if (line === "detached") {
      current.detached = true;
      continue;
    }
  }

  if (current) worktrees.push(current);
  return worktrees;
}

async function getStatusPorcelain(repoPath) {
  return await git(["status", "--porcelain"], { cwd: repoPath });
}

async function hasRemoteBranch(repoPath, remote, branch) {
  const out = await git(["ls-remote", "--heads", remote, branch], { cwd: repoPath });
  return out.trim().length > 0;
}

async function fetchRemoteBranch(repoPath, remote, branch) {
  await git(["fetch", remote, branch], { cwd: repoPath });
}

async function fetchRemoteRef(repoPath, remote, ref) {
  await git(["fetch", remote, ref], { cwd: repoPath });
}

async function forceLocalBranch(repoPath, branch, targetRef) {
  await git(["branch", "-f", branch, targetRef], { cwd: repoPath });
}

async function checkoutBranchAtRemote(repoPath, branch) {
  const remote = "origin";
  await fetchRemoteBranch(repoPath, remote, branch);
  await git(["checkout", "-B", branch, `${remote}/${branch}`], { cwd: repoPath });
}

async function countCommitsBetween(repoPath, baseRef, headRef) {
  const out = await git(["rev-list", "--count", `${baseRef}..${headRef}`], { cwd: repoPath });
  return Number(out.trim() || "0");
}

async function listWorktrees(repoPath) {
  const out = await git(["worktree", "list", "--porcelain"], { cwd: repoPath });
  return parseWorktreeListPorcelain(out);
}

async function pruneWorktrees(repoPath) {
  await git(["worktree", "prune"], { cwd: repoPath });
}

async function addWorktree(repoPath, worktreePath, branch) {
  await git(["worktree", "add", worktreePath, branch], { cwd: repoPath });
}

async function removeWorktree(repoPath, worktreePath, { force = true } = {}) {
  const args = ["worktree", "remove"];
  if (force) args.push("--force");
  args.push(worktreePath);
  await git(args, { cwd: repoPath });
}

async function getCurrentBranch(repoPath) {
  return await git(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoPath });
}

async function resetHard(repoPath, ref) {
  await git(["reset", "--hard", ref], { cwd: repoPath });
}

async function cleanUntracked(repoPath) {
  await git(["clean", "-fd"], { cwd: repoPath });
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

async function deleteLocalBranch(repoPath, branch) {
  await git(["branch", "-D", branch], { cwd: repoPath });
}

module.exports = {
  getStatusPorcelain,
  checkoutBaseAndPull,
  checkoutOrCreateBranch,
  commitAll,
  pushBranch,
  deleteLocalBranch,
  hasRemoteBranch,
  fetchRemoteRef,
  checkoutBranchAtRemote,
  countCommitsBetween,
  listWorktrees,
  pruneWorktrees,
  addWorktree,
  removeWorktree,
  forceLocalBranch,
  getCurrentBranch,
  resetHard,
  cleanUntracked,
};
