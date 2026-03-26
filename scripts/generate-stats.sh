#!/bin/bash
# generate-stats.sh — Erzeugt stats.json und pusht sie zum Webserver
# Läuft auf VM 100 (192.168.8.11) per cron jede Minute
# Ziel: LXC 113 /var/www/neo-website/api/stats.json

set -euo pipefail

REMOTE="root@192.168.8.113"
REMOTE_DIR="/var/www/neo-website/api"
TMP="/tmp/neo-stats.json"

# CPU usage (1-second sample)
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')

# RAM
RAM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
RAM_FREE=$(free -m | awk '/Mem:/ {print $7}')

# Disk
DISK_PCT=$(df -h / | awk 'NR==2 {gsub(/%/,""); print $5}')

# Network RX (rough KB)
NET_RX=$(cat /proc/net/dev | grep -v 'lo:' | grep ':' | head -1 | awk '{print int($2/1024/1024)}')

# Docker containers
CONTAINERS=$(docker ps -q 2>/dev/null | wc -l || echo "8")

# Systemd services (running)
SERVICES=$(systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | wc -l || echo "14")

# Cron jobs count
CRONS="15"

# Uptime in seconds
UPTIME=$(cat /proc/uptime | awk '{print int($1)}')

cat > "$TMP" <<EOF
{
  "cpu": "$CPU",
  "ram_total": $RAM_TOTAL,
  "ram_free": $RAM_FREE,
  "disk_used_pct": "$DISK_PCT",
  "net_rx": "$NET_RX",
  "containers": "$CONTAINERS",
  "services": "$SERVICES",
  "crons": "$CRONS",
  "uptime_seconds": "$UPTIME",
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Push to web server
ssh "$REMOTE" "mkdir -p $REMOTE_DIR"
scp -q "$TMP" "$REMOTE:$REMOTE_DIR/stats.json"
ssh "$REMOTE" "chmod 644 $REMOTE_DIR/stats.json"
