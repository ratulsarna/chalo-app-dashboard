# ExecPlan: Phase 2 — Upstream Git Watcher + Codex/GPT Updater + PRs

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This ExecPlan must be maintained in accordance with `./.ai/plans/PLANS.md` as it exists at the time of writing.

## Purpose / Big Picture

Keep `content/analytics/**` in this dashboard repo continuously up to date with the upstream app repo at `~/Developer/chalo/chalo-app-kmp/` without manual sweeps.

After this change:

- A VPS service runs every 10 minutes, `git pull`s upstream `main`, detects new commits, and (only when upstream changed) triggers an automated update run.
- The update run launches **Codex CLI + GPT‑5.2** to review the upstream diff and update/add/remove:
  - `content/analytics/flows.json`
  - `content/analytics/<flowSlug>/events.json`
  - `content/analytics/<flowSlug>/flow-diagrams.md`
  - (optional) `content/analytics/unassigned.json`
- The run validates the generated artifacts deterministically and opens a PR against this repo (never pushes directly to `main`).

User-visible proof it works:

- Make a new commit on upstream `~/Developer/chalo/chalo-app-kmp/` `main`.
- Within ~10 minutes, this repo receives a new PR with updated analytics docs and a run summary.

## Progress

- [x] (2026-01-10) Create ExecPlan file and resolve open questions.
- [ ] Implement state + lock + git wrappers (tests first).
- [ ] Implement validator (tests first).
- [ ] Implement updater orchestrator (dry-run + real run).
- [ ] Add systemd service + timer (10 minute pull/check).
- [ ] Add docs/runbook for ops + recovery.

## Surprises & Discoveries

- None yet.

## Decision Log

- Decision: Watch upstream repo at `~/Developer/chalo/chalo-app-kmp/` and poll every 10 minutes via `git pull`.
  Rationale: User requirement; simplest reliable mechanism on a VPS.
  Date/Author: 2026-01-10 / ratul
- Decision: The updater is allowed to operate directly in `~/Developer/chalo/chalo-app-kmp/` by checking out `main` and running `git pull --ff-only`.
  Rationale: User answered `1a`; this repo is safe to treat as automation working copy.
  Date/Author: 2026-01-10 / ratul
- Decision: Use GitHub CLI (`gh`) to create PRs.
  Rationale: User answered `2a`; simplest and most reliable on a VPS.
  Date/Author: 2026-01-10 / ratul
- Decision: Run one PR per upstream `HEAD` (diff = `lastProcessedCommit..HEAD`).
  Rationale: User answered `4a`; avoids PR spam while still batching multiple upstream commits.
  Date/Author: 2026-01-10 / ratul
- Decision: Use GPT‑5.2 with reasoning effort set to `high` for the update run, and only invoke Codex when upstream `HEAD` differs from `lastProcessedCommit`.
  Rationale: User requirement (Q3); reduces cost and avoids unnecessary churn.
  Date/Author: 2026-01-10 / ratul
- Decision: Store updater state + lock files outside git as:
  - `STATE_PATH=$HOME/.local/state/chalo-dashboard/analytics-updater/state.json`
  - `LOCK_PATH=$HOME/.local/state/chalo-dashboard/analytics-updater/lock`
  Rationale: Keeps working tree clean and avoids accidental commits; stable on a VPS.
  Date/Author: 2026-01-10 / ratul

## Outcomes & Retrospective

TBD (filled in after Phase 2 implementation).

## Context and Orientation

### Current repo (dashboard) relevant structure

- Analytics content snapshot (current source of truth):
  - `content/analytics/`
  - `content/analytics/<flowSlug>/events.json`
  - `content/analytics/<flowSlug>/flow-diagrams.md`
  - `content/analytics/flows.json`
  - `content/analytics/flow-slug-map.json`
- Analytics ingestion/normalization (read-only, server-only):
  - `src/lib/analytics/fs-source.ts`
  - `src/lib/analytics/types.ts`
- Phase 2 HLD framing:
  - `docs/initial/analytics-dashboard-hld.md`

### Terms

- **Upstream repo**: `~/Developer/chalo/chalo-app-kmp/` (the product app codebase where events originate).
- **Dashboard repo**: this repository, `~/Developer/chalo/chalo-app-dashboard/`.
- **Updater run**: one end-to-end execution that pulls upstream, computes diff, runs Codex to update docs, validates artifacts, and opens a PR.
- **State file**: a local, uncommitted JSON file storing `lastProcessedCommit` and other bookkeeping.
- **Lock**: a mutual exclusion mechanism so only one updater run happens at a time.

### Existing “owners/patterns” to extend

There is no Phase 2 automation code yet. Phase 2 should be implemented as:

- **Repository-local scripts** under a single owner directory (recommended): `scripts/analytics-updater/`
- Keeping analytics parsing/rendering logic in existing owners (`src/lib/analytics/*`) unchanged.

This keeps runtime UI concerns separate from automation concerns and avoids inventing a parallel “analytics source” abstraction.

## Research

### Internal repo patterns inspected

- Existing ExecPlan patterns for style/structure:
  - `.ai/plans/analytics-mvp-execplan.md`
  - `.ai/plans/analytics-diagram-viewer-execplan.md`
- Current analytics filesystem ingestion:
  - `src/lib/analytics/fs-source.ts` (reads `content/analytics/**` and normalizes schema drift)
  - `src/lib/analytics/types.ts`
- Current content directory layout:
  - `content/analytics/*`

### Baseline (before Phase 2 exists)

There is currently no automation that:

- pulls upstream periodically
- runs an LLM-based updater
- opens PRs automatically

Proof:

```bash
cd /home/ratul/Developer/chalo/chalo-app-dashboard
rg -n "systemd|timer|cron|watcher|updater" -S .
```

Expected: no Phase 2 automation code besides design docs.

### External constraints (summarized)

- Upstream events are “random and haphazard”; do **not** rely on AST-only extraction.
- Codex CLI + GPT‑5.2 should do tool-assisted exploration of the upstream diff and surrounding context.
- The system must create PRs for review; it must not push directly to `main`.
- Codex CLI supports configuring the model and “reasoning effort” via config (and per-run config overrides), so the updater can force `gpt-5.2` + `reasoning_effort=high` without relying on whatever a user has set locally.

## Open Questions (User Clarification)

None (resolved: `1a 2a 4a`, plus Q3 guidance on GPT‑5.2 `reasoning_effort=high`).

## Test Specification

Phase 2 is automation + deterministic transformations. Before writing production code, add failing unit tests using Node’s built-in test runner (`node --test`) so we don’t introduce a full test framework.

Add a `test` script to `package.json`:

- `pnpm test` → `node --test`

### Unit tests to write first (must fail initially)

1) `state` module
   - Reading state when file does not exist returns default state (no throw).
   - Writing state is atomic (write temp + rename) and preserves JSON.
   - Corrupt state file results in a clear error with recovery guidance.

2) `lock` module
   - Acquiring lock succeeds when unlocked.
   - Acquiring lock fails (or times out) when already locked.
   - Stale lock detection (optional): can be broken with a `--force` flag.

3) `git` wrapper module
   - `getHeadCommit(repoPath, ref)` returns a SHA string.
   - `pullMain(repoPath)` runs `git pull --ff-only` and errors on merge-needed state.

4) `branch naming + idempotence`
   - Given `upstreamHead`, the branch name is deterministic (e.g., `autoupdate/analytics/<sha>`).
   - Re-running with the same head does not create a second PR (dry-run asserts “no-op”).

5) `validator` module (for `content/analytics/**`)
   - Valid minimal fixture passes.
   - Missing `events.json` or invalid JSON fails with precise error output.
   - Invalid event entries are flagged (but do not crash the validator process).

## Plan of Work

### Milestone 1 — Add the Phase 2 “owner” scripts (scaffolding)

Create `scripts/analytics-updater/` as the single owner of automation logic:

- `scripts/analytics-updater/config.js`
  - Resolve config from env + defaults:
    - `UPSTREAM_REPO_PATH` default: `/home/ratul/Developer/chalo/chalo-app-kmp`
    - `UPSTREAM_BRANCH` default: `main`
    - `DASHBOARD_REPO_PATH` default: `/home/ratul/Developer/chalo/chalo-app-dashboard`
    - `POLL_INTERVAL_MINUTES` default: `10` (for docs; systemd timer controls schedule)
    - `STATE_PATH` default: `/home/ratul/.local/state/chalo-dashboard/analytics-updater/state.json`
    - `LOCK_PATH` default: `/home/ratul/.local/state/chalo-dashboard/analytics-updater/lock`
    - `CODEX_BIN` default: `codex`
    - `CODEX_MODEL` default: `gpt-5.2`
    - `CODEX_REASONING_EFFORT` default: `high`
    - `DRY_RUN` default: `false`
- `scripts/analytics-updater/git.js`
  - Minimal wrapper around `git -C <repo>` to:
    - `checkoutMainAndPullFFOnly()`
    - `getHeadSha(ref)`
    - `diffRange(base, head)` (used only for PR summary/prompt context)
- `scripts/analytics-updater/state.js`
  - Read/write JSON state:
    - `{ lastProcessedCommit: string | null, lastRunAt: string | null, lastRunStatus: "ok"|"failed"|null, lastPRUrl: string | null }`
- `scripts/analytics-updater/lock.js`
  - Lock file under a safe writable path (gitignored).

Add tests for these modules first (see Test Specification).

### Milestone 2 — Deterministic validator for generated artifacts

Implement `scripts/analytics-updater/validate-content.js`:

- Validates `content/analytics/**` on disk.
- Outputs a machine-readable JSON report + human-readable summary to stdout.
- Exit codes:
  - `0` = success
  - `2` = validation failed (block PR creation)
  - `1` = unexpected/internal error

Add unit tests using small fixture directories under `scripts/analytics-updater/__fixtures__/`.

### Milestone 3 — Updater orchestrator (run-once)

Implement `scripts/analytics-updater/run-once.js`:

1) Acquire lock.
2) Pull upstream `main`:
   - `git -C ~/Developer/chalo/chalo-app-kmp checkout main`
   - `git -C ... pull --ff-only`
3) Determine upstream `HEAD` SHA.
4) Compare with `state.lastProcessedCommit`:
   - If unchanged: exit 0 (no-op).
5) Prepare a working branch in the dashboard repo:
   - `git checkout -B autoupdate/analytics/<upstreamHead>`
6) Launch Codex CLI with a structured prompt:
   - Provide:
     - upstream repo path
     - commit range
     - where to write outputs (`content/analytics/**`)
     - explicit rules: preserve exact strings, update/remove/add files, prefer multiple diagrams for huge flows, produce `unassigned.json` when needed
     - require a run summary file (e.g., `content/analytics/_run-summary.md` or PR body output to stdout)
   - Invoke only when upstream `HEAD` differs from `state.lastProcessedCommit`.
   - Force model controls (per user requirement):
     - `model=gpt-5.2`
     - `model_reasoning_effort=high`
   - Implementation note (to verify during Milestone 3):
     - Prefer `codex exec` with per-run config overrides (typically via `-c key=value`) so the service run is deterministic.
   - Use a short prompt that points Codex to repo-tracked instructions:
     - Instructions file: `.ai/codex/analytics-updater.md`
     - Prompt shape (example):
       - `Read the instructions in .ai/codex/analytics-updater.md and do exactly what it says for: upstream repo <path>, commit range <base..head>.`
7) Run deterministic validator.
8) If validation passes:
   - Commit changes on the branch.
   - Push branch.
   - Open PR with `gh` (`gh pr create ...`).
   - Update state: set `lastProcessedCommit = upstreamHead`, store PR URL.
9) If validation fails:
   - Do not open PR.
   - Do not advance `lastProcessedCommit`.
   - Record failure in state and logs.

Add `--dry-run`:
- Does everything except: pushing branch + opening PR + writing `lastProcessedCommit`.

### Milestone 4 — VPS service (systemd timer)

Add systemd unit templates under `ops/systemd/` (repo-tracked):

- `ops/systemd/chalo-analytics-updater.service`
  - Runs `node scripts/analytics-updater/run-once.js` with environment variables.
  - Loads secrets (API keys) via `EnvironmentFile=` (never commit secrets to the repo).
- `ops/systemd/chalo-analytics-updater.timer`
  - Runs every 10 minutes (`OnUnitActiveSec=10min`).

Provide a runbook in the ExecPlan `Concrete Steps` for installing and enabling these units.

## Concrete Steps

All commands run from `/home/ratul/Developer/chalo/chalo-app-dashboard` unless specified.

### Create a feature branch (do not commit to `main`)

```bash
git checkout main
git pull --ff-only
git checkout -b feat/phase2-updater
```

### Add test runner hook

```bash
pnpm -s lint
# after adding test script:
pnpm -s test
```

Expected (after implementation): `node --test` reports passing tests.

### Manual dry-run (no PR creation)

```bash
node scripts/analytics-updater/run-once.js --dry-run
```

Expected:
- If no upstream changes: “no-op” and exit 0.
- If upstream changed: it runs Codex + validator, but does not push/PR and does not advance state.

### Install systemd units (VPS)

```bash
sudo cp ops/systemd/chalo-analytics-updater.service /etc/systemd/system/
sudo cp ops/systemd/chalo-analytics-updater.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now chalo-analytics-updater.timer
```

Create an environment file for secrets and paths (example):

```bash
sudo mkdir -p /etc/chalo-dashboard
sudoedit /etc/chalo-dashboard/analytics-updater.env
```

Example contents (do not commit):

```bash
UPSTREAM_REPO_PATH=/home/ratul/Developer/chalo/chalo-app-kmp
UPSTREAM_BRANCH=main
CODEX_MODEL=gpt-5.2
CODEX_REASONING_EFFORT=high
OPENAI_API_KEY=...redacted...
```

Check status/logs:

```bash
systemctl status chalo-analytics-updater.timer
systemctl status chalo-analytics-updater.service
journalctl -u chalo-analytics-updater.service -n 200 --no-pager
```

## Validation and Acceptance

Acceptance is behavior + tests.

1) Unit tests
   - Run `pnpm -s test` and expect all tests pass.
   - Confirm at least one test fails before implementation and passes after.

2) Dry-run acceptance
   - Run `node scripts/analytics-updater/run-once.js --dry-run` and confirm:
     - It pulls upstream (or no-ops if already up to date).
     - It does not push branches or create PRs.
     - It prints a clear summary.

3) Real-run acceptance (controlled)
   - Create a harmless upstream commit (e.g., modify a comment) on `~/Developer/chalo/chalo-app-kmp` `main`.
   - Run `node scripts/analytics-updater/run-once.js` (non-dry).
   - Expect:
     - A new branch in this repo is pushed.
     - A PR is opened against `main`.
     - PR includes a summary of changed flows/events and any `unassigned.json` items.

4) Timer acceptance
   - Enable systemd timer and confirm it triggers every 10 minutes.
   - Confirm concurrency guard: overlapping runs do not occur.

## Idempotence and Recovery

- Idempotence:
  - If upstream `HEAD` equals `lastProcessedCommit`, the run is a no-op and exits 0.
  - If the same upstream `HEAD` is processed again (e.g., state did not advance due to a crash after PR creation), the updater must not open a second PR. It should prefer updating the deterministic branch `autoupdate/analytics/<sha>` and reusing the existing PR (via `gh pr view` + `gh pr edit` or similar), or no-op if there are no new changes.

- Recovery:
  - If a run fails mid-way, the lock is released on process exit; if not, `--force` (optional) can break a stale lock.
  - `lastProcessedCommit` is only advanced after validation passes and PR is created.
  - Manual fallback: rerun `node scripts/analytics-updater/run-once.js --dry-run` to inspect failure without side effects.

## Artifacts and Notes

Expected state file example (path TBD by Open Questions):

```json
{
  "lastProcessedCommit": "abc123...",
  "lastRunAt": "2026-01-10T12:34:56Z",
  "lastRunStatus": "ok",
  "lastPRUrl": "https://github.com/ratulsarna/chalo-app-dashboard/pull/123"
}
```

## Interfaces and Dependencies

### Scripts (new)

At end of implementation, the following entrypoints must exist:

- `scripts/analytics-updater/run-once.js`
  - Flags:
    - `--dry-run` (no pushing/PR/state advance)
  - Env:
    - `UPSTREAM_REPO_PATH` (default `/home/ratul/Developer/chalo/chalo-app-kmp`)
    - `UPSTREAM_BRANCH` (default `main`)
    - GitHub auth via `gh` (the service user must be authenticated)

- `scripts/analytics-updater/validate-content.js`
  - Validates `content/analytics/**` deterministically.

### Services (new)

- `ops/systemd/chalo-analytics-updater.service`
- `ops/systemd/chalo-analytics-updater.timer` (10 minute cadence)

### Tooling expectations (must be verified during implementation)

- `git` is installed and has access to upstream remotes.
- `gh` is installed and authenticated for `ratulsarna/chalo-app-dashboard`.
- Codex CLI is installed/configured and can be run non-interactively by the service user.
- The Codex invocation used by the updater can force `gpt-5.2` and `model_reasoning_effort=high` (verify via `codex --help` / `codex config` during implementation).
- The service user has API credentials available for the Codex model provider (e.g., `OPENAI_API_KEY` for `model_provider=openai`).

## Plan Revision Notes

- (2026-01-10) Initial Phase 2 ExecPlan created.
- (2026-01-10) Updated plan with user answers (`1a 2a 4a`) and clarified model requirement (GPT‑5.2 + `reasoning_effort=high`, only run when upstream changes).
