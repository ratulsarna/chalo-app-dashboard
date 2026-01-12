#!/usr/bin/env bash
set -euo pipefail

# Generates GoAccess HTML report for Chalo Dashboard traffic.
# Intended to be run as root (via systemd timer), reading nginx logs.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_HTML="${ROOT_DIR}/public/reports/traffic.html"
OUT_DIR="$(dirname "$OUT_HTML")"

LOG_GLOB="/var/log/nginx/chalo-dashboard.access.log*"

mkdir -p "$OUT_DIR"

# If the dedicated vhost access log isn't configured yet, don't fail the timer.
if ! compgen -G "$LOG_GLOB" >/dev/null; then
  echo "No logs found at $LOG_GLOB (is nginx access_log configured in the :443 server block?)"
  exit 0
fi

# GoAccess validates output filename extensions; ensure the temp file ends with .html.
TMP_HTML="$(mktemp --tmpdir="$OUT_DIR" traffic.XXXXXX.html)"

# Read plain + rotated .gz logs if present
zcat -f $LOG_GLOB 2>/dev/null \
  | goaccess - --log-format=COMBINED --ignore-crawlers -o "$TMP_HTML"

mv -f "$TMP_HTML" "$OUT_HTML"
chmod 0644 "$OUT_HTML"

echo "Wrote $OUT_HTML"

