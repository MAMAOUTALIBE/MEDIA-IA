#!/usr/bin/env bash
# Hostinger VPS hardening — UFW + fail2ban + sysctl tuning.
#
# Idempotent: re-running won't break anything. Run once after fresh VPS install,
# re-run if you change SSH port.
#
# Usage:
#   sudo ./infra/firewall/setup-ufw.sh
#   sudo SSH_PORT=2222 ./infra/firewall/setup-ufw.sh   # if custom SSH port

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "❌ Must run as root (use sudo)"
  exit 1
fi

SSH_PORT="${SSH_PORT:-22}"

echo "▶ Updating apt index"
apt-get update -qq

echo "▶ Installing ufw + fail2ban + unattended-upgrades"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ufw fail2ban unattended-upgrades apt-listchanges

# ──────────────────────────────────────────────────────────────────────────────
# UFW — minimal exposed surface
# ──────────────────────────────────────────────────────────────────────────────
echo "▶ Configuring UFW firewall"
ufw --force reset >/dev/null

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Required ports
ufw allow "$SSH_PORT"/tcp comment 'SSH'
ufw allow 80/tcp           comment 'HTTP (redirected to HTTPS by Traefik)'
ufw allow 443/tcp          comment 'HTTPS'

# IMPORTANT: do NOT open 5432 / 6379 / 9000 / 9001 / 3000 / 4000.
# Those are reachable only over the docker network — see docker-compose.override.yml.

ufw --force enable

echo "▶ UFW status:"
ufw status verbose

# ──────────────────────────────────────────────────────────────────────────────
# fail2ban — block brute-force on SSH (and HTTP auth later)
# ──────────────────────────────────────────────────────────────────────────────
echo "▶ Configuring fail2ban"
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled  = true
port     = $SSH_PORT
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 3
bantime  = 24h
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# ──────────────────────────────────────────────────────────────────────────────
# unattended-upgrades — security patches automatic
# ──────────────────────────────────────────────────────────────────────────────
echo "▶ Enabling unattended-upgrades for security patches"
dpkg-reconfigure -f noninteractive unattended-upgrades

# ──────────────────────────────────────────────────────────────────────────────
# Sysctl hardening — tighten the kernel defaults
# ──────────────────────────────────────────────────────────────────────────────
echo "▶ Applying sysctl hardening"
cat > /etc/sysctl.d/99-cmr-hardening.conf <<'EOF'
# Disable IP forwarding (we're not a router)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Drop ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Drop source-routed packets (spoofing protection)
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Enable reverse path filtering (anti-spoofing)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Log martian packets (suspicious source addresses)
net.ipv4.conf.all.log_martians = 1

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048

# Ignore broadcast pings
net.ipv4.icmp_echo_ignore_broadcasts = 1
EOF
sysctl --system --quiet

echo
echo "✅ Hardening complete."
echo "   - SSH open on port $SSH_PORT"
echo "   - HTTPS (443) + HTTP (80) open for Traefik"
echo "   - All other ports closed"
echo "   - fail2ban watching SSH"
echo "   - Auto security updates enabled"
echo
echo "Next: deploy CMR with ./infra/scripts/deploy-vps.sh"
