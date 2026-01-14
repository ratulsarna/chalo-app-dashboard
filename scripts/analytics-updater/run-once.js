#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");

const { resolveConfig } = require("./src/config.js");
const { acquireLock, releaseLock } = require("./src/lock.js");
const upstreamGit = require("./src/git.js");
const { readState, writeStateAtomic } = require("./src/state.js");
const { validateAnalyticsContent } = require("./src/validate-content.js");
const { computeUpdateBranchName, shouldRunForHead } = require("./src/orchestrator.js");
const { runCodexUpdater } = require("./src/codex.js");
const { createOrUpdatePr } = require("./src/gh.js");
const dashboardGit = require("./src/git-dashboard.js");

function nowIso() {
  return new Date().toISOString();
}

function shortSha(sha) {
  return sha.slice(0, 12);
}

function stripAnsi(s) {
  // Avoid regex literals containing control characters (some linters/formatters flag them).
  const ansi = new RegExp("\\u001b\\[[0-9;]*m", "g");
  return String(s).replace(ansi, "");
}

function truncateForLog(s, maxChars = 8000) {
  const str = stripAnsi(s);
  if (str.length <= maxChars) return str;
  return `${str.slice(0, maxChars)}\n\n[...truncated...]`;
}

function sanitizeCodexFailureMessage(codex) {
  const summary = codex && typeof codex === "object" ? codex.summary : "";
  if (typeof summary === "string" && summary.trim().length > 0) return summary.trim();

  const raw =
    codex && typeof codex === "object"
      ? codex.rawStderr || codex.rawStdout || "Unknown Codex failure"
      : "Unknown Codex failure";

  let sanitized = truncateForLog(raw);
  const apiKey = process.env.OPENAI_API_KEY;
  if (typeof apiKey === "string" && apiKey.length > 0) {
    sanitized = sanitized.split(apiKey).join("[REDACTED]");
  }
  return sanitized;
}

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

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function safeDirNameForBranch(branch) {
  // Avoid slashes in branch names and keep paths relatively readable for debugging.
  return String(branch || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "_")
    .slice(0, 160);
}

async function main() {
  const config = resolveConfig();

  await acquireLock(config.lockPath, { force: config.forceLock });
  try {
    await assertAbsoluteDirExists("UPSTREAM_REPO_PATH", config.upstreamRepoPath);
    await assertAbsoluteDirExists("DASHBOARD_REPO_PATH", config.dashboardRepoPath);
    await assertAbsoluteFileExists("CODEX_INSTRUCTIONS_PATH", config.instructionsPath);

    const state = await readState(config.statePath);

    // Ensure upstream is up to date.
    await upstreamGit.ensureCleanWorktree(config.upstreamRepoPath);
    await upstreamGit.checkoutBranch(config.upstreamRepoPath, config.upstreamBranch);
    await upstreamGit.pullFFOnly(config.upstreamRepoPath);
    const upstreamHead = await upstreamGit.revParse(config.upstreamRepoPath, "HEAD");

    if (!state.lastProcessedCommit) {
      if (config.init || config.dryRun) {
        console.log(`[init] No state exists; baseline set to upstream HEAD ${upstreamHead}`);
        if (!config.dryRun) {
          await writeStateAtomic(config.statePath, {
            ...state,
            lastProcessedCommit: upstreamHead,
            lastRunAt: nowIso(),
            lastRunStatus: "ok",
          });
        }
        return;
      }

      console.log(`[init-required] State file has no lastProcessedCommit; re-run with --init (or set it manually).`);
      process.exitCode = 2;
      return;
    }

    if (!shouldRunForHead(state, upstreamHead)) {
      console.log(`[no-op] Upstream HEAD unchanged (${upstreamHead}).`);
      return;
    }

    const base = state.lastProcessedCommit;
    const range = `${base}..${upstreamHead}`;

    const branch = computeUpdateBranchName(shortSha(upstreamHead));

    // Use an isolated worktree so the updater never checks out branches in the primary dashboard working copy.
    const worktreesRoot = path.join(path.dirname(config.statePath), "worktrees");
    const worktreeName = safeDirNameForBranch(branch);
    let worktreePath = path.join(worktreesRoot, worktreeName);

    // Recovery path: if the update branch already exists on origin (e.g., Codex succeeded but PR
    // creation failed), reuse it and try PR creation without rerunning Codex.
    const remoteHasBranch = await dashboardGit.hasRemoteBranch(config.dashboardRepoPath, "origin", branch);
    if (config.dryRun) {
      if (remoteHasBranch) {
        console.log(`[dry-run] Would reuse existing remote branch ${branch} and open/update PR for upstream range ${range}.`);
      } else {
        console.log(`[dry-run] Would create a worktree at ${worktreePath} for branch ${branch} and run Codex for upstream range ${range}.`);
      }
      return;
    }

    let createdWorktree = false;
    let completedOk = false;
    try {
      await fs.mkdir(worktreesRoot, { recursive: true });

      // Best-effort cleanup of stale worktree entries before we decide whether to reuse an existing one.
      await dashboardGit.pruneWorktrees(config.dashboardRepoPath).catch(() => {});

      const worktrees = await dashboardGit.listWorktrees(config.dashboardRepoPath);
      const existingForBranch = worktrees.find((w) => w.branch === branch);
      if (existingForBranch && existingForBranch.path) {
        worktreePath = existingForBranch.path;
      } else if (await pathExists(worktreePath)) {
        // Avoid reusing an on-disk folder that isn't a registered worktree.
        worktreePath = `${worktreePath}_${Date.now()}`;
      }

      // Ensure we have up-to-date remote refs without touching the main worktree checkout.
      await dashboardGit.fetchRemoteRef(config.dashboardRepoPath, "origin", config.dashboardBaseBranch);
      if (remoteHasBranch) {
        await dashboardGit.fetchRemoteRef(config.dashboardRepoPath, "origin", branch);
        await dashboardGit.forceLocalBranch(config.dashboardRepoPath, branch, `origin/${branch}`);
      } else {
        await dashboardGit.forceLocalBranch(config.dashboardRepoPath, branch, `origin/${config.dashboardBaseBranch}`);
      }

      if (!existingForBranch) {
        await dashboardGit.addWorktree(config.dashboardRepoPath, worktreePath, branch);
        createdWorktree = true;
      }

      const currentBranch = await dashboardGit.getCurrentBranch(worktreePath);
      if (currentBranch !== branch) {
        throw new Error(
          `Existing worktree is on branch ${currentBranch} (expected ${branch}): ${worktreePath}`,
        );
      }

      // Always start from a clean worktree at the expected ref (this worktree is updater-owned).
      if (remoteHasBranch) {
        await dashboardGit.resetHard(worktreePath, `origin/${branch}`);
      } else {
        await dashboardGit.resetHard(worktreePath, `origin/${config.dashboardBaseBranch}`);
      }
      await dashboardGit.cleanUntracked(worktreePath);

      if (remoteHasBranch) {
        const commits = await dashboardGit.countCommitsBetween(
          config.dashboardRepoPath,
          `origin/${config.dashboardBaseBranch}`,
          `origin/${branch}`,
        );

        if (commits > 0) {
          const title = `Analytics docs update (${shortSha(upstreamHead)})`;
          const body = `Upstream range: \`${range}\`\n\n(Recovered run: reusing existing update branch.)\n`;
          const prUrl = await createOrUpdatePr({
            cwd: worktreePath,
            headBranch: branch,
            baseBranch: config.dashboardBaseBranch,
            title,
            body,
          });

          await writeStateAtomic(config.statePath, {
            ...state,
            lastProcessedCommit: upstreamHead,
            lastRunAt: nowIso(),
            lastRunStatus: "ok",
            lastPRUrl: prUrl,
          });

          console.log(`[ok] Opened/updated PR (recovery): ${prUrl}`);
          completedOk = true;
          return;
        }
      }

      const codex = await runCodexUpdater({
        codexBin: config.codexBin,
        model: config.codexModel,
        reasoningEffort: config.codexReasoningEffort,
        dashboardRepoPath: worktreePath,
        upstreamRepoPath: config.upstreamRepoPath,
        baseSha: base,
        headSha: upstreamHead,
        instructionsPath: config.instructionsPath,
        upstreamBranch: config.upstreamBranch,
      });

      if (!codex.ok) {
        const msg = sanitizeCodexFailureMessage(codex);
        throw new Error(`Codex updater failed for range ${range}: ${msg}`);
      }

      // Validate content after Codex edits.
      const validation = await validateAnalyticsContent(worktreePath);
      if (!validation.ok) {
        const errors = validation.issues.filter((i) => i.level === "error");
        const sample = errors
          .slice(0, 10)
          .map((e) => `${e.code}: ${e.path}${e.message ? ` (${e.message})` : ""}`);
        process.exitCode = 2;
        throw new Error(`Content validation failed:\n${sample.join("\n")}`);
      }

      const committed = await dashboardGit.commitAll(
        worktreePath,
        `chore(analytics): update docs for ${shortSha(upstreamHead)}`,
      );

      if (!committed) {
        console.log(`[no-changes] Codex produced no content changes; advancing state to ${upstreamHead}.`);

        await writeStateAtomic(config.statePath, {
          ...state,
          lastProcessedCommit: upstreamHead,
          lastRunAt: nowIso(),
          lastRunStatus: "ok",
          lastPRUrl: state.lastPRUrl,
        });
        completedOk = true;
        return;
      }

      await dashboardGit.pushBranch(worktreePath, branch);

      const title = `Analytics docs update (${shortSha(upstreamHead)})`;
      const body = [
        `Upstream range: \`${range}\``,
        ``,
        codex.summary?.trim() ? codex.summary.trim() : "_No summary produced by Codex._",
      ].join("\n");

      const prUrl = await createOrUpdatePr({
        cwd: worktreePath,
        headBranch: branch,
        baseBranch: config.dashboardBaseBranch,
        title,
        body,
      });

      await writeStateAtomic(config.statePath, {
        ...state,
        lastProcessedCommit: upstreamHead,
        lastRunAt: nowIso(),
        lastRunStatus: "ok",
        lastPRUrl: prUrl,
      });

      console.log(`[ok] Opened/updated PR: ${prUrl}`);
      completedOk = true;
    } finally {
      // Clean up successful/no-op runs. Keep the worktree on failures for debugging.
      if (createdWorktree && completedOk) {
        try {
          await dashboardGit.removeWorktree(config.dashboardRepoPath, worktreePath, { force: true });
          await dashboardGit.pruneWorktrees(config.dashboardRepoPath).catch(() => {});
        } catch {
          // ignore cleanup failures
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error(message);

    // Best-effort state update (do not advance lastProcessedCommit).
    try {
      const config = resolveConfig();
      const state = await readState(config.statePath);
      await writeStateAtomic(config.statePath, {
        ...state,
        lastRunAt: nowIso(),
        lastRunStatus: "failed",
      });
    } catch {
      // ignore secondary failure
    }

    process.exitCode = process.exitCode || 1;
  } finally {
    try {
      const config = resolveConfig();
      await releaseLock(config.lockPath);
    } catch {
      // ignore lock cleanup failure
    }
  }
}

void main();
