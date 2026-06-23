import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type { Message } from '../types/thread.js'

interface MessageRow {
  id: string
  thread_id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  provider_id: string | null
  model_id: string | null
  ts: number
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    providerId: row.provider_id ?? undefined,
    modelId: row.model_id ?? undefined,
    ts: new Date(row.ts),
  }
}

export class MessageRepository {
  constructor(private readonly db: Database) {}

  create(input: {
    threadId: string
    role: Message['role']
    content: string
    providerId?: string
    modelId?: string
  }): Message {
    const id = randomUUID()
    const ts = Date.now()
    this.db.prepare(`
      INSERT INTO messages (id, thread_id, role, content, provider_id, model_id, ts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.threadId, input.role, input.content, input.providerId ?? null, input.modelId ?? null, ts)
    return this.findById(id)!
  }

  findById(id: string): Message | null {
    const row = this.db.prepare<string, MessageRow>(
      'SELECT * FROM messages WHERE id = ?'
    ).get(id)
    return row ? rowToMessage(row) : null
  }

  listByThread(threadId: string): Message[] {
    const rows = this.db.prepare<string, MessageRow>(
      'SELECT * FROM messages WHERE thread_id = ? ORDER BY ts ASC'
    ).all(threadId)
    return rows.map(rowToMessage)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM messages WHERE id = ?').run(id)
    return result.changes > 0
  }
}
