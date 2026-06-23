import { generateToken } from '../auth/jwt.js'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    text?: string
    from?: { id: number; first_name?: string }
    chat?: { id: number }
  }
}

interface TelegramBotConfig {
  token: string
  allowedUserIds: number[]
  backendUrl: string
}

const BACKEND_TIMEOUT_MS = 30_000
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000

export class TelegramBotBridge {
  private offset = 0
  private polling = false
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private chatThreadMap = new Map<number, string>()
  private tokenCache = new Map<number, { token: string; expiresAt: number }>()
  private chatLocks = new Map<number, Promise<void>>()

  constructor(private readonly config: TelegramBotConfig) {}

  async start(): Promise<void> {
    if (this.polling) return
    this.polling = true
    this.poll()
  }

  stop(): void {
    this.polling = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  isRunning(): boolean {
    return this.polling
  }

  getMappedChats(): number {
    return this.chatThreadMap.size
  }

  private poll(): void {
    if (!this.polling) return
    this.fetchUpdates()
      .catch((err) => { console.error('[TelegramBridge] polling error:', err) })
      .finally(() => {
        if (this.polling) {
          this.pollTimer = setTimeout(() => this.poll(), 2000)
        }
      })
  }

  async fetchUpdates(): Promise<TelegramUpdate[]> {
    const res = await fetch(
      `https://api.telegram.org/bot${this.config.token}/getUpdates?offset=${this.offset}&timeout=10`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) throw new Error(`Telegram API error: ${res.status}`)
    const data = await res.json() as { ok: boolean; result: TelegramUpdate[] }
    if (!data.ok) throw new Error('Telegram API returned ok=false')

    for (const update of data.result) {
      this.offset = update.update_id + 1
      await this.handleUpdate(update).catch(err => {
        console.error('[TelegramBridge] handleUpdate error:', err)
      })
    }
    return data.result
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message
    if (!msg?.text || !msg.chat || !msg.from) return

    // Fail-closed: empty allowedUserIds means no one is permitted
    if (!this.config.allowedUserIds.includes(msg.from.id)) {
      await this.sendMessage(msg.chat.id, 'You are not authorized to use this bot.')
      return
    }

    const text = msg.text.trim()
    const from = msg.from
    const chatId = msg.chat.id

    const token = this.getOrCreateToken(from.id)
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    if (text === '/start' || text === '/help') {
      await this.sendMessage(chatId, [
        'Codex AI Bot',
        '',
        '/newthread - Create a new conversation',
        '/chat <message> - Send message to current thread',
        '/status - Show connection status',
      ].join('\n'))
      return
    }

    if (text === '/newthread') {
      const thread = await this.createThread(chatId, from, token)
      if (!thread) return
      await this.sendMessage(chatId, `Thread created: ${thread.title} (${thread.id})`)
      return
    }

    if (text === '/status') {
      const threadId = this.chatThreadMap.get(chatId)
      await this.sendMessage(chatId, threadId
        ? `Connected to thread: ${threadId}`
        : 'No thread connected. Use /newthread to create one.')
      return
    }

    if (text === '/chat' || text.startsWith('/chat ')) {
      const content = text.slice(5).trim()
      if (!content) {
        await this.sendMessage(chatId, 'Usage: /chat <your message>')
        return
      }

      await this.withChatLock(chatId, async () => {
        let threadId = this.chatThreadMap.get(chatId)
        if (!threadId) {
          const thread = await this.createThread(chatId, from, token)
          if (!thread) return
          threadId = thread.id
        }

        await fetch(`${this.config.backendUrl}/api/threads/${threadId}/messages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ role: 'user', content }),
          signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        })

        const historyRes = await fetch(`${this.config.backendUrl}/api/threads/${threadId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        })
        let messages: Array<{ role: string; content: string }> = [{ role: 'user', content }]
        if (historyRes.ok) {
          const history = await historyRes.json() as Array<{ role: string; content: string }>
          if (history.length > 0) messages = history
        }

        const completionRes = await fetch(`${this.config.backendUrl}/api/chat/completions`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ messages, stream: false }),
          signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        })
        if (!completionRes.ok) {
          await this.sendMessage(chatId, 'AI request failed.')
          return
        }
        const completion = await completionRes.json() as { choices?: Array<{ message?: { content?: string } }> }
        const reply = completion.choices?.[0]?.message?.content ?? '(no response)'

        await fetch(`${this.config.backendUrl}/api/threads/${threadId}/messages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ role: 'assistant', content: reply }),
          signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        })

        await this.sendMessage(chatId, reply)
      })
      return
    }

    await this.sendMessage(chatId, 'Unknown command. Use /help to see available commands.')
  }

  private async withChatLock(chatId: number, fn: () => Promise<void>): Promise<void> {
    const prev = this.chatLocks.get(chatId) ?? Promise.resolve()
    const next = prev.then(fn, fn)
    this.chatLocks.set(chatId, next)
    await next
  }

  private getOrCreateToken(userId: number): string {
    const now = Date.now()
    const cached = this.tokenCache.get(userId)
    if (cached && now < cached.expiresAt) return cached.token
    const token = generateToken(`tg-${userId}`, `${userId}@telegram.local`, 'user')
    this.tokenCache.set(userId, { token, expiresAt: now + TOKEN_TTL_MS })
    return token
  }

  private async createThread(chatId: number, from: { id: number; first_name?: string }, token: string): Promise<{ id: string; title: string } | null> {
    const threadRes = await fetch(`${this.config.backendUrl}/api/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: `Telegram ${from.first_name ?? from.id}` }),
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    })
    if (!threadRes.ok) {
      await this.sendMessage(chatId, 'Failed to create thread.')
      return null
    }
    const thread = await threadRes.json() as { id: string; title: string }
    this.chatThreadMap.set(chatId, thread.id)
    return thread
  }

  private async sendMessage(chatId: number, text: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  }
}

export function createTelegramBridge(): TelegramBotBridge | null {
  const token = process.env['TELEGRAM_BOT_TOKEN']
  if (!token) return null

  const rawIds = process.env['TELEGRAM_ALLOWED_USER_IDS'] ?? ''
  const allowedUserIds = rawIds
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))

  if (allowedUserIds.length === 0) {
    console.warn('[TelegramBridge] TELEGRAM_ALLOWED_USER_IDS is not set — all users will be rejected. Set this to your Telegram numeric user IDs.')
  }

  const rawBackendUrl = process.env['TELEGRAM_BACKEND_URL'] ?? 'http://localhost:3001'
  let backendUrl: string
  try {
    const parsed = new URL(rawBackendUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`unsupported protocol: ${parsed.protocol}`)
    }
    backendUrl = parsed.href.replace(/\/$/, '')
  } catch (e) {
    throw new Error(`TELEGRAM_BACKEND_URL is invalid: ${rawBackendUrl} — ${e}`)
  }

  return new TelegramBotBridge({ token, allowedUserIds, backendUrl })
}
