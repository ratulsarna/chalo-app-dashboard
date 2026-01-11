# Chalo Dashboard

Internal dashboard web app (starting with Analytics docs).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Convex (local dev deployment; can be linked to a cloud deployment later)

## Analytics docs

- Snapshot data lives in `content/analytics/`.
- The web UI reads from the filesystem for now (Convex is used for local dev and future persistence/search).

## Local development

Install deps:

```bash
pnpm install
```

1) Start Convex (local):

```bash
pnpm dlx convex dev
```

2) Start Next.js:

```bash
pnpm dev
```

The Convex CLI writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local`.

### Developing on a VPS

If you run `pnpm dev` on a remote VPS, open it locally via an SSH tunnel:

```bash
ssh -L 3000:127.0.0.1:3000 ratul@<vps-ip>
```

Then visit `http://localhost:3000` on your laptop.

## Phase 2: analytics docs updater (automation)

The repo contains a “poll upstream + update docs + open PR” updater intended to run on the VPS:

- Entry point: `scripts/analytics-updater/run-once.js`
- Systemd units (every 10 minutes): `ops/systemd/`
  - Setup instructions: `ops/systemd/README.md`

### Manual run

```bash
# Baseline the state file to current upstream HEAD (no PR created)
node scripts/analytics-updater/run-once.js --init

# Show what would happen (no PR/state writes)
node scripts/analytics-updater/run-once.js --dry-run

# Break a stuck lock (use with care)
node scripts/analytics-updater/run-once.js --force-lock
```

Notes:
- The updater assumes the upstream repo is at `~/Developer/chalo/chalo-app-kmp` by default (override via `UPSTREAM_REPO_PATH`).
- PR creation uses the GitHub CLI (`gh`) and requires it to be authenticated for the service user.
- Codex auth is expected to already be configured on the VPS for the service user (the updater does not require `OPENAI_API_KEY`/`OPENAI_BASE_URL` env vars).
