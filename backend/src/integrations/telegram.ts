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

export class TelegramBotBridge {
  private offset = 0
  private polling = false
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private chatThreadMap = new Map<number, string>()

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
      .catch(() => {})
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
      await this.handleUpdate(update).catch(() => {})
    }
    return data.result
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message
    if (!msg?.text || !msg.chat || !msg.from) return

    if (this.config.allowedUserIds.length > 0 && !this.config.allowedUserIds.includes(msg.from.id)) {
      await this.sendMessage(msg.chat.id, 'You are not authorized to use this bot.')
      return
    }

    const text = msg.text.trim()

    if (text === '/start' || text === '/help') {
      await this.sendMessage(msg.chat.id, [
        'Codex AI Bot',
        '',
        '/newthread - Create a new conversation',
        '/chat <message> - Send message to current thread',
        '/status - Show connection status',
      ].join('\n'))
      return
    }

    if (text === '/newthread') {
      const threadRes = await fetch(`${this.config.backendUrl}/api/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Telegram ${msg.from.first_name ?? msg.from.id}`, userId: `tg-${msg.from.id}` }),
      })
      if (!threadRes.ok) {
        await this.sendMessage(msg.chat.id, 'Failed to create thread.')
        return
      }
      const thread = await threadRes.json() as { id: string; title: string }
      this.chatThreadMap.set(msg.chat.id, thread.id)
      await this.sendMessage(msg.chat.id, `Thread created: ${thread.title} (${thread.id})`)
      return
    }

    if (text === '/status') {
      const threadId = this.chatThreadMap.get(msg.chat.id)
      await this.sendMessage(msg.chat.id, threadId
        ? `Connected to thread: ${threadId}`
        : 'No thread connected. Use /newthread to create one.')
      return
    }

    if (text.startsWith('/chat ')) {
      const content = text.slice(6).trim()
      if (!content) {
        await this.sendMessage(msg.chat.id, 'Usage: /chat <your message>')
        return
      }

      let threadId = this.chatThreadMap.get(msg.chat.id)
      if (!threadId) {
        const threadRes = await fetch(`${this.config.backendUrl}/api/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `Telegram ${msg.from.first_name ?? msg.from.id}`, userId: `tg-${msg.from.id}` }),
        })
        if (!threadRes.ok) {
          await this.sendMessage(msg.chat.id, 'Failed to create thread.')
          return
        }
        const thread = await threadRes.json() as { id: string }
        threadId = thread.id
        this.chatThreadMap.set(msg.chat.id, threadId)
      }

      await fetch(`${this.config.backendUrl}/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content }),
      })

      const completionRes = await fetch(`${this.config.backendUrl}/api/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content }], stream: false }),
      })
      if (!completionRes.ok) {
        await this.sendMessage(msg.chat.id, 'AI request failed.')
        return
      }
      const completion = await completionRes.json() as { choices?: Array<{ message?: { content?: string } }> }
      const reply = completion.choices?.[0]?.message?.content ?? '(no response)'

      await fetch(`${this.config.backendUrl}/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: reply }),
      })

      await this.sendMessage(msg.chat.id, reply)
      return
    }

    await this.sendMessage(msg.chat.id, 'Unknown command. Use /help to see available commands.')
  }

  private async sendMessage(chatId: number, text: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
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

  const backendUrl = process.env['TELEGRAM_BACKEND_URL'] ?? 'http://localhost:3001'

  return new TelegramBotBridge({ token, allowedUserIds, backendUrl })
}
