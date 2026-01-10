const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function runGh(args, { cwd }) {
  const { stdout } = await execFileAsync("gh", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

async function tryRunGh(args, { cwd }) {
  try {
    return { ok: true, stdout: await runGh(args, { cwd }) };
  } catch (err) {
    return { ok: false, err };
  }
}

async function writeTempFile(contents) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-updater-pr-"));
  const filePath = path.join(dir, "body.md");
  await fs.writeFile(filePath, contents, "utf8");
  return {
    path: filePath,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

async function ensureGhAuth(cwd) {
  const res = await tryRunGh(["auth", "status", "-h", "github.com"], { cwd });
  if (res.ok) return;
  const msg = res.err instanceof Error ? res.err.message : String(res.err);
  throw new Error(`GitHub CLI not authenticated (gh auth status failed): ${msg}`);
}

async function findExistingPrUrl(cwd, headBranch) {
  const res = await tryRunGh(["pr", "view", "--head", headBranch, "--json", "url", "--jq", ".url"], { cwd });
  if (!res.ok) return null;
  const url = res.stdout.trim();
  return url.length ? url : null;
}

async function createOrUpdatePr({ cwd, headBranch, baseBranch, title, body }) {
  await ensureGhAuth(cwd);
  const { path: bodyFile, cleanup } = await writeTempFile(`${body.trim()}\n`);
  try {
    const existing = await findExistingPrUrl(cwd, headBranch);
    if (existing) {
      await runGh(["pr", "edit", "--head", headBranch, "--title", title, "--body-file", bodyFile], { cwd });
      return existing;
    }

    const url = await runGh(
      ["pr", "create", "--base", baseBranch, "--head", headBranch, "--title", title, "--body-file", bodyFile],
      { cwd },
    );
    return url.trim();
  } finally {
    await cleanup();
  }
}

module.exports = { createOrUpdatePr, findExistingPrUrl, ensureGhAuth };
