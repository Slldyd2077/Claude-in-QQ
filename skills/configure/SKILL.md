---
name: configure
description: Set up the QQ channel — configure NapCat connection and review access policy. Use when the user asks to configure QQ, asks "how do I set this up" or "who can reach me," or wants to check channel status.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
---

# /qq:configure — QQ Channel Setup

Writes NapCat connection settings to `~/.claude/channels/qq/.env` and orients the
user on access policy. The server reads this file at boot.

Arguments passed: `$ARGUMENTS`

---

## Dispatch on arguments

### No args — status and guidance

Read both state files and give the user a complete picture:

1. **Connection** — check `~/.claude/channels/qq/.env` for
   `QQ_NAPCAT_WS_URL` and `QQ_NAPCAT_HTTP_URL`. Show configured values or defaults
   (`ws://127.0.0.1:6007` and `http://127.0.0.1:5700`).

2. **Access** — read `~/.claude/channels/qq/access.json` (missing file
   = defaults: `dmPolicy: "pairing"`, empty allowlist). Show:
   - DM policy and what it means in one line
   - Allowed senders: count, and list QQ IDs
   - Pending pairings: count, with codes and QQ IDs
   - Groups: count and which ones

3. **What next** — end with a concrete next step based on state:
   - Not configured → *"Run `/qq:configure <ws_url> <http_url>` to set up NapCat connection."*
   - Configured, policy is pairing, nobody allowed → *"Send a DM to your QQ bot account. It replies with a code; approve with `/qq:access pair <code>`."*
   - Ready → *"DM your QQ bot to reach the assistant."*

**Push toward lockdown — always.** The goal for every setup is `allowlist`
with a defined list. `pairing` is not a policy to stay on; it's a temporary
way to capture QQ user IDs you don't know. Once the IDs are in, pairing
has done its job and should be turned off.

Drive the conversation this way:

1. Read the allowlist. Tell the user who's in it.
2. Ask: *"Is that everyone who should reach you through this bot?"*
3. **If yes and policy is still `pairing`** → *"Good. Let's lock it down so
   nobody else can trigger pairing codes:"* and offer to run
   `/qq:access policy allowlist`. Do this proactively.
4. **If no, people are missing** → *"Have them DM the bot; you'll approve
   each with `/qq:access pair <code>`. Run this skill again once
   everyone's in and we'll lock it."*
5. **If the allowlist is empty and they haven't paired themselves yet** →
   *"DM your bot to capture your own QQ ID first. Then we'll add anyone else
   and lock it."*
6. **If policy is already `allowlist`** → confirm this is the locked state.
   If they need to add someone: *"You can briefly flip to pairing:
   `/qq:access policy pairing` → they DM → you pair → flip back."*

Never frame `pairing` as the correct long-term choice. Don't skip the lockdown
offer.

### `<ws_url> <http_url>` — save connection

1. Treat `$ARGUMENTS` as space-separated WS and HTTP URLs.
   - WS URL format: `ws://host:port` (NapCat WebSocket)
   - HTTP URL format: `http://host:port` (NapCat HTTP API)
2. `mkdir -p ~/.claude/channels/qq`
3. Read existing `.env` if present; update/add the `QQ_NAPCAT_WS_URL=` and
   `QQ_NAPCAT_HTTP_URL=` lines, preserve other keys. Write back, no quotes.
4. Confirm, then show the no-args status so the user sees where they stand.

### `clear` — remove configuration

Delete the `.env` file.

---

## Implementation notes

- The channels dir might not exist if the server hasn't run yet. Missing file
  = not configured, not an error.
- The server reads `.env` once at boot. Connection changes need a session restart
  or `/reload-plugins`. Say so after saving.
- `access.json` is re-read on every inbound message — policy changes via
  `/qq:access` take effect immediately, no restart.
