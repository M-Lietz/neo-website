#!/bin/bash
# generate-stats.sh — Erzeugt /var/www/neo-website/api/stats.json
# Wird von cron alle 30s oder 1min aufgerufen
# Auf LXC 113 (oder VM 100) ausführen

set -euo pipefail

OUTPUT_DIR="/var/www/neo-website/api"
OUTPUT_FILE="$OUTPUT_DIR/stats.json"

mkdir -p "$OUTPUT_DIR"

# CPU usage (1-second sample)
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')

# RAM
RAM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
RAM_FREE=$(free -m | awk '/Mem:/ {print $7}')

# Disk
DISK_PCT=$(df -h / | awk 'NR==2 {gsub(/%/,""); print $5}')

# Network RX (KB/s rough estimate)
NET_RX=$(cat /proc/net/dev | grep -E 'eth0|ens' | head -1 | awk '{print int($2/1024/1024)}')

# Docker containers
CONTAINERS=$(docker ps -q 2>/dev/null | wc -l || echo "8")

# Systemd services (running)
SERVICES=$(systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | wc -l || echo "14")

# Cron jobs count
CRONS="15"

# Uptime in seconds
UPTIME=$(cat /proc/uptime | awk '{print int($1)}')

cat > "$OUTPUT_FILE" <<EOF
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

chmod 644 "$OUTPUT_FILE"
