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

### Login auth (optional)

If you want a login page with a static username/password, set:

```bash
AUTH_USERNAME=your-username
AUTH_PASSWORD=your-password
AUTH_SECRET=a-long-random-string
```

When all three are set, the app requires sign-in for all routes. If any are missing, auth is disabled.

### Developing on a VPS

If you run `pnpm dev` on a remote VPS, open it locally via an SSH tunnel:

```bash
ssh -L 3000:127.0.0.1:3000 ratul@<vps-ip>
```

Then visit `http://localhost:3000` on your laptop.

## Production deployment (VPS)

Live deployment:
- Domain: `chalodash.ratulsarna.com`
- Next.js port: `3010`
- Repo path: `/home/ratul/Developer/chalo/chalo-app-dashboard`
- Service user: `ratul` (systemd `--user`)

### Runtime (systemd user service)

Files:
- Service unit: `~/.config/systemd/user/chalo-dashboard.service`
- Environment file: `~/.config/chalo-dashboard.env` (not in git)

Env file must include:
- `PORT=3010`
- `NODE_ENV=production`
- `AUTH_USERNAME=...`
- `AUTH_PASSWORD=...` (quote it if it contains `#`)
- `AUTH_SECRET=...`

Service commands:
```bash
systemctl --user status chalo-dashboard --no-pager
journalctl --user -u chalo-dashboard -f
systemctl --user restart chalo-dashboard
```

Redeploy:
```bash
cd /home/ratul/Developer/chalo/chalo-app-dashboard
git pull
pnpm install
pnpm build
systemctl --user restart chalo-dashboard
```

Content-only updates (`content/analytics/**`):
- The analytics filesystem snapshot uses React `cache()` on the server, so content updates require a process restart to take effect.
- No rebuild needed if only `content/analytics/**` changes, but you must restart:
  `systemctl --user restart chalo-dashboard`

### Reverse proxy (Nginx)

Files:
- Site: `/etc/nginx/sites-available/chalo-dashboard`
- Enabled via symlink: `/etc/nginx/sites-enabled/chalo-dashboard`

Proxy:
- `chalodash.ratulsarna.com` → `http://127.0.0.1:3010`
- Must set `X-Forwarded-Proto` and `Host` headers so auth redirects work correctly behind the proxy.

TLS (Let’s Encrypt):
```bash
sudo certbot --nginx -d chalodash.ratulsarna.com
```

### Firewall (UFW)

Allow SSH + web traffic (keep SSH open):
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status verbose
```

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
