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

    // Prepare dashboard branch.
    const dashStatus = await dashboardGit.getStatusPorcelain(config.dashboardRepoPath);
    if (dashStatus.length > 0) {
      throw new Error(`Dashboard repo has uncommitted changes: ${config.dashboardRepoPath}`);
    }
    await dashboardGit.checkoutBaseAndPull(config.dashboardRepoPath, config.dashboardBaseBranch);
    const branch = computeUpdateBranchName(shortSha(upstreamHead));

    // Recovery path: if the update branch already exists on origin (e.g., Codex succeeded but PR
    // creation failed), reuse it and try PR creation without rerunning Codex.
    const remoteHasBranch = await dashboardGit.hasRemoteBranch(config.dashboardRepoPath, "origin", branch);
    if (remoteHasBranch) {
      await dashboardGit.checkoutBranchAtRemote(config.dashboardRepoPath, branch);
      const commits = await dashboardGit.countCommitsBetween(
        config.dashboardRepoPath,
        config.dashboardBaseBranch,
        branch,
      );

      if (commits > 0) {
        if (config.dryRun) {
          console.log(`[dry-run] Would open/update PR (recovery) for branch ${branch} and upstream range ${range}.`);
          return;
        }

        const title = `Analytics docs update (${shortSha(upstreamHead)})`;
        const body = `Upstream range: \`${range}\`\n\n(Recovered run: reusing existing update branch.)\n`;
        const prUrl = await createOrUpdatePr({
          cwd: config.dashboardRepoPath,
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
        return;
      }
    }

    await dashboardGit.checkoutOrCreateBranch(config.dashboardRepoPath, branch);

    if (config.dryRun) {
      console.log(`[dry-run] Would run Codex for upstream range ${range}.`);
      return;
    }

    const codex = await runCodexUpdater({
      codexBin: config.codexBin,
      model: config.codexModel,
      reasoningEffort: config.codexReasoningEffort,
      dashboardRepoPath: config.dashboardRepoPath,
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
    const validation = await validateAnalyticsContent(config.dashboardRepoPath);
    if (!validation.ok) {
      const errors = validation.issues.filter((i) => i.level === "error");
      const sample = errors.slice(0, 10).map((e) => `${e.code}: ${e.path}${e.message ? ` (${e.message})` : ""}`);
      process.exitCode = 2;
      throw new Error(`Content validation failed:\n${sample.join("\n")}`);
    }

    const committed = await dashboardGit.commitAll(
      config.dashboardRepoPath,
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
      return;
    }

    await dashboardGit.pushBranch(config.dashboardRepoPath, branch);

    const title = `Analytics docs update (${shortSha(upstreamHead)})`;
    const body = [
      `Upstream range: \`${range}\``,
      ``,
      codex.summary?.trim() ? codex.summary.trim() : "_No summary produced by Codex._",
    ].join("\n");

    const prUrl = await createOrUpdatePr({
      cwd: config.dashboardRepoPath,
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
