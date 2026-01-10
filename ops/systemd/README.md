# Analytics updater (systemd)

This directory contains `systemd` unit files to run the analytics docs updater every 10 minutes on a VPS.

## Install

```bash
sudo mkdir -p /etc/chalo-dashboard
sudoedit /etc/chalo-dashboard/analytics-updater.env
```

Example `/etc/chalo-dashboard/analytics-updater.env`:

```bash
UPSTREAM_REPO_PATH=/home/ratul/Developer/chalo/chalo-app-kmp
UPSTREAM_BRANCH=main
DASHBOARD_REPO_PATH=/home/ratul/Developer/chalo/chalo-app-dashboard
CODEX_MODEL=gpt-5.2
CODEX_REASONING_EFFORT=high
```

Then:

```bash
sudo cp ops/systemd/chalo-analytics-updater.service /etc/systemd/system/
sudo cp ops/systemd/chalo-analytics-updater.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now chalo-analytics-updater.timer
```

## First-time init

The updater needs an initial baseline `lastProcessedCommit` before it can compute a diff. Run once manually:

```bash
cd /home/ratul/Developer/chalo/chalo-app-dashboard
node scripts/analytics-updater/run-once.js --init
```

## Observe logs

```bash
systemctl status chalo-analytics-updater.timer
journalctl -u chalo-analytics-updater.service -n 200 --no-pager
```

