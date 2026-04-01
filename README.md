# Claude in QQ

> 更适合中国程序员体质的 Claude Code Channel ~

[![License](https://img.shields.io/github/license/Slldyd2077/Claude-in-QQ)](https://github.com/Slldyd2077/Claude-in-QQ/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-000?logo=bun&logoColor=white)](https://bun.sh/)
[![NapCat](https://img.shields.io/badge/protocol-OneBot%20v11-12B886?logo=qq&logoColor=white)](https://github.com/NapNeko/NapCatQQ)
[![Claude Code](https://img.shields.io/badge/powered%20by-Claude%20Code-D97757?logo=anthropic&logoColor=white)](https://claude.ai/code)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/Slldyd2077/Claude-in-QQ?style=social)](https://github.com/Slldyd2077/Claude-in-QQ)

[English](./README_EN.md)

一个基于 [NapCat/OneBot v11](https://github.com/NapNeko/NapCatQQ) 的 QQ 频道，让 [Claude Code](https://claude.ai/code) 能实时接收和回复 QQ 消息。

**为什么要做这个？** Claude Code 官方只支持 Telegram Channel，对国内用户极不友好。这个项目让中国开发者能通过 QQ 直接使用 Claude Code 进行编程辅助，无需科学上网。

## 功能特性

- **私聊 & 群聊** — 支持私聊和群聊消息，群聊支持 @ 触发
- **访问控制** — 配对码验证、白名单、群组级别策略
- **消息桥接** — 基于 WebSocket 的消息轮询 + 文件收件箱
- **富媒体支持** — 图片下载、文件附件、QQ 表情
- **文本分片** — 自动拆分超长回复，适配 QQ 消息长度限制

## 架构

```
QQ 消息 → NapCat (OneBot v11) → WebSocket → qq-poll.ts → messages.jsonl
                                                              ↓
Claude Code ← cron 轮询 ← messages.jsonl → mcp__qq__reply → NapCat HTTP API → QQ
```

- **入站**：NapCat WS (端口 6007) → `qq-poll.ts` 写入 `messages.jsonl`
- **处理**：Claude Code 定时轮询 `messages.jsonl`，处理每条消息
- **出站**：`mcp__qq__reply` 工具 → NapCat HTTP API (端口 5700) → QQ

## 快速开始

### 前置条件

- 已安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- 已运行 [NapCat](https://github.com/NapNeko/NapCatQQ) 并启用 OneBot v11
- 已安装 [Bun](https://bun.sh/) 运行时

### 1. 配置 NapCat

在 NapCat 配置文件（`data/config_<QQ号>.json`）中启用：

- **HTTP API** 端口 5700
- **WebSocket Server** 端口 6007
- **HTTP POST** 上报到 `http://127.0.0.1:9801`（可选，用于直接 MCP 模式）

### 2. 安装

```bash
git clone https://github.com/Slldyd2077/Claude-in-QQ.git
cd Claude-in-QQ
bun install
```

### 3. 配置频道

创建 `~/.claude/channels/qq/.env`：

```env
QQ_NAPCAT_HTTP_URL=http://127.0.0.1:5700
QQ_HTTP_POST_PORT=9801
```

运行 access skill 授权你的 QQ 号：

```bash
# 在 Claude Code 中：
/qq:access allow <你的QQ号>
```

### 4. 启动桥接脚本

```bash
bun run qq-poll.ts
```

启动 WebSocket 监听器，捕获 QQ 消息并写入收件箱。

### 5. 在 Claude Code 中设置定时轮询

在 Claude Code 会话中，设置 cron 定时检查收件箱：

```
# 每分钟检查新的 QQ 消息并处理
```

Claude Code 会从 `~/.claude/channels/qq/inbox/messages.jsonl` 读取新消息，处理后通过 MCP 工具回复。

## 项目结构

```
Claude-in-QQ/
├── server.ts          # MCP 服务器（stdio + HTTP，945 行）
├── qq-poll.ts         # WebSocket 桥接（NapCat → 文件收件箱）
├── package.json       # 依赖：@modelcontextprotocol/sdk, ws
├── .mcp.json          # Claude Code 的 MCP 服务器配置
├── setup.sh           # 首次安装脚本
├── skills/
│   ├── access/        # /qq:access — 管理白名单、配对、群组
│   │   └── SKILL.md
│   └── configure/     # /qq:configure — 初始配置
│       └── SKILL.md
├── README.md          # 中文说明（本文件）
├── README_EN.md       # 英文说明
├── CHANGELOG.md       # 项目日志
└── LICENSE            # MIT 协议
```

## 访问控制

频道使用三级访问系统，通过 `/qq:access` 管理：

| 策略 | 行为 |
|------|------|
| `pairing`（配对） | 新用户获得 6 位验证码；用户在终端运行 `/qq:access pair <code>` 批准 |
| `allowlist`（白名单） | 只有预先批准的 QQ 号可以发消息 |
| `disabled`（禁用） | 拒绝所有私聊 |

群聊支持按群设置 `allowFrom` 白名单和 `requireAt`（需要 @ 机器人才响应）。

## 配置项

环境变量（在 `~/.claude/channels/qq/.env` 中配置）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `QQ_NAPCAT_HTTP_URL` | `http://127.0.0.1:5700` | NapCat HTTP API 地址 |
| `QQ_HTTP_POST_PORT` | `9801` | HTTP POST 监听端口 |
| `QQ_ACCESS_MODE` | （动态） | 设为 `static` 启用只读访问模式 |
| `QQ_STATE_DIR` | `~/.claude/channels/qq` | 状态文件目录 |

## 安全说明

- 所有配置文件存储在 `~/.claude/channels/qq/` 用户目录下，不随项目仓库分发
- `access.json` 权限设为 600（仅当前用户可读写）
- `.env` 文件不含密钥/Token，仅包含本地地址和端口
- 聊天记录（`messages.jsonl`、`processed.jsonl`）在用户本地，已加入 `.gitignore`

## 开源协议

MIT License — 详见 [LICENSE](./LICENSE) 文件
