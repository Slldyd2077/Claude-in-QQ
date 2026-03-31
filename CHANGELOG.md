# Claude in QQ - 项目日志

## 2026-04-01

### 完成的工作

#### QQ Channel MCP Server 搭建
- 实现了完整的 QQ/NapCat OneBot v11 MCP server (`server.ts`)
- 支持 DM 和群聊消息，access control (pairing/allowlist)，消息分片，附件发送
- 出站通道（Claude → QQ）通过 NapCat HTTP API (port 5700) 工作正常

#### 消息桥接方案
- 初始方案：NapCat HTTP POST 上报 → MCP server HTTP (port 9801) → MCP notification → Claude Code
- 问题：MCP `notifications/claude/channel` 在 stdio transport 下未自动触发 Claude Code 响应
- 当前方案：NapCat WS (port 6007) → `qq-poll.ts` 写入 JSONL → Cron 每分钟轮询 → Claude Code 处理并回复

#### 代码优化
- 合并 `poll-messages.ts` 和 `qq-poll.ts` 为单一 bridge 脚本
- 添加 message_id 去重（解决重复写入问题）
- 删除废弃的 `test-mock.sh`
- 改进重连逻辑和日志格式

### 已知问题
- MCP channel notification 机制未生效，需要 cron 轮询 workaround
- Cron 间隔 1 分钟，响应有延迟
- 需要手动启动 `qq-poll.ts` bridge 脚本

### 配置
- NapCat: HTTP API 5700, WS 6007, WebUI 3080
- MCP server: HTTP POST 9801 (备用)
- Bridge 脚本: `qq-poll.ts` 连接 WS 6007
- 允许用户: QQ 3553934102 (凡人)
