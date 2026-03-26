#!/bin/bash
# deploy.sh — Build Astro + Deploy auf LXC 113
# Verwendung: ./scripts/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REMOTE_HOST="root@192.168.8.113"
REMOTE_DIR="/var/www/neo-website"

echo "🔧 Building Astro site..."
cd "$PROJECT_DIR"
npm run build

echo ""
echo "📦 Build complete. Contents:"
ls -lah dist/
echo ""

echo "🚀 Deploying to LXC 113 ($REMOTE_HOST)..."

# Create api directory on remote with stats endpoint
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_DIR/api"

# Sync dist/ contents to remote web root
# Using rsync for efficient delta transfer
rsync -avz --delete \
  --exclude='api/' \
  dist/ "$REMOTE_HOST:$REMOTE_DIR/"

# Copy stats generator script
scp "$SCRIPT_DIR/generate-stats.sh" "$REMOTE_HOST:/usr/local/bin/neo-generate-stats.sh"
ssh "$REMOTE_HOST" "chmod +x /usr/local/bin/neo-generate-stats.sh"

# Generate initial stats
ssh "$REMOTE_HOST" "/usr/local/bin/neo-generate-stats.sh" 2>/dev/null || echo "⚠️ Stats generation failed (Docker may not be on LXC)"

# Set permissions
ssh "$REMOTE_HOST" "chown -R www-data:www-data $REMOTE_DIR && chmod -R 755 $REMOTE_DIR"

echo ""
echo "✅ Deploy erfolgreich!"
echo "   Site: https://neo.lietztech.com"
echo "   Server: $REMOTE_HOST:$REMOTE_DIR"
echo ""
