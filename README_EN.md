# Claude in QQ

> A Claude Code Channel tailored for Chinese developers ~

[![License](https://img.shields.io/github/license/Slldyd2077/Claude-in-QQ)](https://github.com/Slldyd2077/Claude-in-QQ/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-000?logo=bun&logoColor=white)](https://bun.sh/)
[![NapCat](https://img.shields.io/badge/protocol-OneBot%20v11-12B886?logo=qq&logoColor=white)](https://github.com/NapNeko/NapCatQQ)
[![Claude Code](https://img.shields.io/badge/powered%20by-Claude%20Code-D97757?logo=anthropic&logoColor=white)](https://claude.ai/code)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/Slldyd2077/Claude-in-QQ?style=social)](https://github.com/Slldyd2077/Claude-in-QQ)

[简体中文](./README.md)

A QQ (NapCat/OneBot v11) channel for [Claude Code](https://claude.ai/code), enabling Claude to receive and reply to QQ messages in real time.

**Why?** Claude Code's official channels only support Telegram — not great for users in China. This project bridges that gap, letting Chinese developers use Claude Code through QQ natively.

## Features

- **Private & Group Chat** — Supports DM and group messages with @-triggering
- **Access Control** — Pairing, allowlist, and group-level policies
- **Message Bridge** — WebSocket-based polling with file-based inbox
- **Rich Media** — Image download, file attachments, face stickers
- **Text Chunking** — Auto-split long responses to fit QQ message limits
- **Seamless Interaction** — Common tools auto-approved; user confirmations routed through QQ instead of terminal

## Architecture

```
QQ Message → NapCat (OneBot v11) → WebSocket → qq-poll.ts → messages.jsonl
                                                            ↓
Claude Code ← cron poll ← messages.jsonl → mcp__qq__reply → NapCat HTTP API → QQ
```

- **Inbound**: NapCat WS (port 6007) → `qq-poll.ts` filters group messages, checks allowlist, writes to `messages.jsonl`
- **Processing**: Claude Code cron polls `messages.jsonl`, processes each message with auto-approved tools
- **Outbound**: `mcp__qq__reply` tool → NapCat HTTP API (port 5700) → QQ

## Quick Start

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- [NapCat](https://github.com/NapNeko/NapCatQQ) running with OneBot v11 enabled
- [Bun](https://bun.sh/) runtime

### 1. Configure NapCat

In your NapCat config (`data/config_<QQ_ID>.json`), enable:

- **HTTP API** on port 5700
- **WebSocket Server** on port 6007
- **HTTP POST** reporting to `http://127.0.0.1:9801` (optional, for direct MCP mode)

### 2. Install

```bash
git clone https://github.com/Slldyd2077/Claude-in-QQ.git
cd Claude-in-QQ
bun install
```

### 3. Configure Channel

Create `~/.claude/channels/qq/.env`:

```env
QQ_NAPCAT_HTTP_URL=http://127.0.0.1:5700
QQ_HTTP_POST_PORT=9801
```

Run the access skill to approve your QQ ID:

```bash
# In Claude Code:
/qq:access allow <your_qq_number>
```

### 4. Start the Bridge

```bash
bun run qq-poll.ts
```

This starts the WebSocket listener that captures QQ messages and writes them to the inbox.

### 5. Start Claude Code with Cron

In your Claude Code session, set up a cron to poll the inbox:

```
# Every minute, check for new QQ messages and process them
```

Claude Code will read new messages from `~/.claude/channels/qq/inbox/messages.jsonl`, process them, and reply via the MCP tools.

## Project Structure

```
Claude-in-QQ/
├── server.ts          # MCP server (stdio + HTTP, 945 lines)
├── qq-poll.ts         # WebSocket bridge (NapCat → file inbox)
├── package.json       # Dependencies: @modelcontextprotocol/sdk, ws
├── .mcp.json          # MCP server configuration for Claude Code
├── setup.sh           # First-time setup script
├── skills/
│   ├── access/        # /qq:access — manage allowlist, pairing, groups
│   │   └── SKILL.md
│   └── configure/     # /qq:configure — initial setup
│       └── SKILL.md
├── README.md          # Chinese documentation
├── README_EN.md       # English documentation (this file)
├── CHANGELOG.md       # Project log
└── LICENSE            # MIT License
```

## Access Control

The channel uses a three-tier access system managed via `/qq:access`:

| Policy | Behavior |
|--------|----------|
| `pairing` | New users get a 6-char code; user runs `/qq:access pair <code>` to approve |
| `allowlist` | Only pre-approved QQ IDs can message |
| `disabled` | All DMs dropped |

Groups support per-group `allowFrom` lists and `requireAt` (must @ the bot).

## Configuration

Environment variables (in `~/.claude/channels/qq/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `QQ_NAPCAT_HTTP_URL` | `http://127.0.0.1:5700` | NapCat HTTP API endpoint |
| `QQ_HTTP_POST_PORT` | `9801` | HTTP POST listener port |
| `QQ_ACCESS_MODE` | (dynamic) | Set to `static` for read-only access |
| `QQ_STATE_DIR` | `~/.claude/channels/qq` | State directory |

## Security

- All config files stored in `~/.claude/channels/qq/`, not distributed with the repo
- `access.json` has permissions set to 600 (owner read/write only)
- `.env` contains no secrets/tokens, only local addresses and ports
- Chat logs (`messages.jsonl`, `processed.jsonl`) stay local, included in `.gitignore`

## License

MIT License — see [LICENSE](./LICENSE) file
