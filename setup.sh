#!/usr/bin/env bash
set -euo pipefail

# Claude in QQ — First-time setup script
# Run this after cloning the repository

CHANNEL_DIR="$HOME/.claude/channels/qq"
INBOX_DIR="$CHANNEL_DIR/inbox"
ENV_FILE="$CHANNEL_DIR/.env"
ACCESS_FILE="$CHANNEL_DIR/access.json"
APPROVED_DIR="$CHANNEL_DIR/approved"

echo "=== Claude in QQ Setup ==="
echo ""

# 1. Create directory structure
echo "[1/4] Creating directories..."
mkdir -p "$INBOX_DIR" "$APPROVED_DIR"
chmod 700 "$CHANNEL_DIR" 2>/dev/null || true

# 2. Create .env if missing
echo "[2/4] Configuring environment..."
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" << 'EOF'
QQ_NAPCAT_HTTP_URL=http://127.0.0.1:5700
QQ_HTTP_POST_PORT=9801
EOF
  chmod 600 "$ENV_FILE"
  echo "  Created $ENV_FILE with defaults"
else
  echo "  $ENV_FILE already exists, skipping"
fi

# 3. Create default access.json if missing
echo "[3/4] Setting up access control..."
if [ ! -f "$ACCESS_FILE" ]; then
  cat > "$ACCESS_FILE" << 'EOF'
{
  "dmPolicy": "pairing",
  "allowFrom": [],
  "groups": {},
  "pending": {}
}
EOF
  chmod 600 "$ACCESS_FILE"
  echo "  Created $ACCESS_FILE (pairing mode — new users need approval)"
else
  echo "  $ACCESS_FILE already exists, skipping"
fi

# 4. Install dependencies
echo "[4/4] Installing dependencies..."
bun install --no-summary 2>/dev/null || npm install

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "  1. Make sure NapCat is running (HTTP API on port 5700, WS on port 6007)"
echo "  2. Start the bridge:  bun run qq-poll.ts"
echo "  3. Send a QQ message to the bot — you'll get a pairing code"
echo "  4. In Claude Code, run:  /qq:access pair <code>"
echo ""
echo "Or add yourself directly:  /qq:access allow <your_QQ_number>"
