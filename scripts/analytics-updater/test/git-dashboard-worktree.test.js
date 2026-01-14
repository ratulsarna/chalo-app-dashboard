const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const gitDashboard = require("../src/git-dashboard.js");

const execFileAsync = promisify(execFile);

async function git(args, { cwd }) {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

test("git-dashboard worktree helpers create/list/remove a branch worktree", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-git-"));
  const repoPath = path.join(tmp, "repo");
  const worktreePath = path.join(tmp, "wt");

  await fs.mkdir(repoPath, { recursive: true });
  await git(["init"], { cwd: repoPath });
  await git(["config", "user.email", "test@example.com"], { cwd: repoPath });
  await git(["config", "user.name", "Test"], { cwd: repoPath });

  await fs.writeFile(path.join(repoPath, "README.md"), "hello\n", "utf8");
  await git(["add", "-A"], { cwd: repoPath });
  await git(["commit", "-m", "init"], { cwd: repoPath });

  const branch = "autoupdate/analytics/test-sha";
  await gitDashboard.forceLocalBranch(repoPath, branch, "HEAD");
  await gitDashboard.addWorktree(repoPath, worktreePath, branch);

  const worktreesAfterAdd = await gitDashboard.listWorktrees(repoPath);
  assert.ok(worktreesAfterAdd.some((w) => w.path === worktreePath && w.branch === branch));
  assert.equal(await gitDashboard.getCurrentBranch(worktreePath), branch);

  // Ensure cleanup helpers run without error.
  await fs.writeFile(path.join(worktreePath, "tmp.txt"), "x\n", "utf8");
  await gitDashboard.resetHard(worktreePath, "HEAD");
  await gitDashboard.cleanUntracked(worktreePath);

  await gitDashboard.removeWorktree(repoPath, worktreePath, { force: true });
  await gitDashboard.pruneWorktrees(repoPath);

  const worktreesAfterRemove = await gitDashboard.listWorktrees(repoPath);
  assert.ok(!worktreesAfterRemove.some((w) => w.path === worktreePath));
});

