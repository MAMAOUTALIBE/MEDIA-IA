#!/usr/bin/env bash
# Install the daily backup cron job + log rotation.
# Usage: sudo ./infra/backup/install-cron.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "❌ Must run as root (use sudo)"
  exit 1
fi

CMR_DIR="${CMR_DIR:-/opt/cmr}"
LOG_FILE="/var/log/cmr-backup.log"

# Daily backup at 02:00 UTC (off-peak globally)
CRON_LINE="0 2 * * * cd $CMR_DIR && /usr/bin/env bash $CMR_DIR/infra/backup/backup-postgres.sh >> $LOG_FILE 2>&1"

# Idempotent: replace existing line for this script, or append.
crontab -l 2>/dev/null | grep -v "backup-postgres.sh" > /tmp/cmr-cron.tmp || true
echo "$CRON_LINE" >> /tmp/cmr-cron.tmp
crontab /tmp/cmr-cron.tmp
rm /tmp/cmr-cron.tmp

# Log rotation
cat > /etc/logrotate.d/cmr-backup <<EOF
$LOG_FILE {
  weekly
  rotate 8
  compress
  delaycompress
  missingok
  notifempty
  create 0640 root root
}
EOF

echo "✅ Cron installed:"
crontab -l | grep backup-postgres
echo
echo "Logs → $LOG_FILE"
echo "Test now: bash $CMR_DIR/infra/backup/backup-postgres.sh"
