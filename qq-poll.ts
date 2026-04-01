#!/usr/bin/env bun
/**
 * QQ message bridge: NapCat WS → message file → Claude Code cron polls it.
 *
 * Listens on NapCat WebSocket, captures messages from allowed users,
 * deduplicates by message_id, writes them to a JSONL file.
 * Claude Code's cron picks them up for processing.
 */

const NAPCAT_WS = process.env.NAPCAT_WS ?? 'ws://127.0.0.1:6007'
const NAPCAT_HTTP = process.env.QQ_NAPCAT_HTTP_URL ?? 'http://127.0.0.1:5700'
const INBOX = process.env.QQ_INBOX ?? `${process.env.HOME}/.claude/channels/qq/inbox`
const ALLOWED_USERS = (process.env.QQ_ALLOWED_USERS ?? '3553934102').split(',')

// Context commands that are handled directly without forwarding to Claude
const CONTEXT_COMMANDS = ['/compact', '/clear']

import { mkdirSync, appendFileSync, readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

mkdirSync(INBOX, { recursive: true })
const MSG_FILE = join(INBOX, 'messages.jsonl')

// Deduplication: track recent message_ids to prevent duplicates
const recentIds = new Map<string, number>() // id → timestamp
const DEDUP_TTL = 60_000 // 1 minute

function isDuplicate(messageId: string): boolean {
  const now = Date.now()
  // Prune expired entries
  for (const [id, ts] of recentIds) {
    if (now - ts > DEDUP_TTL) recentIds.delete(id)
  }
  if (recentIds.has(messageId)) return true
  recentIds.set(messageId, now)
  return false
}

// Send a direct reply via NapCat HTTP API (bypasses Claude)
async function directReply(userId: string, text: string): Promise<void> {
  try {
    await fetch(`${NAPCAT_HTTP}/send_private_msg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: Number(userId), message: text }),
    })
  } catch (err) {
    console.error('[qq-bridge] Direct reply failed:', err)
  }
}

let reconnectDelay = 1000

function connect() {
  console.log(`[qq-bridge] Connecting to ${NAPCAT_WS}`)
  const ws = new WebSocket(NAPCAT_WS)

  ws.addEventListener('open', () => {
    reconnectDelay = 1000
    console.log('[qq-bridge] Connected')
  })

  ws.addEventListener('message', async (event) => {
    try {
      const raw = typeof event.data === 'string' ? event.data : await (event.data as Blob).text()
      const msg = JSON.parse(raw)

      if (msg.post_type !== 'message') return

      const userId = String(msg.user_id)
      if (!ALLOWED_USERS.includes(userId)) return

      const messageId = String(msg.message_id)
      if (isDuplicate(messageId)) {
        console.log(`[qq-bridge] Dedup: skipping ${messageId}`)
        return
      }

      const record = {
        chat_id: msg.message_type === 'private' ? userId : String(msg.group_id),
        message_id: messageId,
        user: msg.sender.card || msg.sender.nickname || userId,
        user_id: userId,
        ts: new Date(msg.time * 1000).toISOString(),
        message_type: msg.message_type,
        text: msg.raw_message || '(empty)',
      }

      // Handle context management commands directly
      const cmd = record.text.trim().toLowerCase()
      if (CONTEXT_COMMANDS.includes(cmd)) {
        if (cmd === '/compact') {
          console.log(`[qq-bridge] Context compact requested by ${userId}`)
          await directReply(userId, 'Context compressed. I\'ll be more concise going forward.')
          // Write a compact command marker so the cron handler knows
          appendFileSync(MSG_FILE, JSON.stringify({ ...record, text: '__CMD_COMPACT__' }) + '\n')
        } else if (cmd === '/clear') {
          console.log(`[qq-bridge] Context clear requested by ${userId}`)
          await directReply(userId, 'Context cleared. Your next message starts a fresh conversation.')
          appendFileSync(MSG_FILE, JSON.stringify({ ...record, text: '__CMD_CLEAR__' }) + '\n')
        }
        return
      }

      appendFileSync(MSG_FILE, JSON.stringify(record) + '\n')
      console.log(`[qq-bridge] Saved: ${userId}: ${record.text.slice(0, 50)}`)
    } catch (err) {
      console.error('[qq-bridge] Error:', err)
    }
  })

  ws.addEventListener('close', () => {
    console.log(`[qq-bridge] Disconnected, reconnecting in ${reconnectDelay}ms...`)
    setTimeout(connect, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, 30000)
  })

  ws.addEventListener('error', () => {
    ws.close()
  })
}

connect()
