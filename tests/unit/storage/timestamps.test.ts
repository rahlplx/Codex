import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabase } from '../../../backend/src/storage/database.js'
import { ThreadRepository } from '../../../backend/src/storage/threads.js'
import { MessageRepository } from '../../../backend/src/storage/messages.js'
import type { Database } from 'better-sqlite3'

let db: Database
let threads: ThreadRepository
let messages: MessageRepository

beforeEach(() => {
  db = openDatabase(':memory:')
  threads = new ThreadRepository(db)
  messages = new MessageRepository(db)
})

describe('Timestamp format consistency', () => {
  it('threads.created_at is stored as TEXT, not INTEGER', () => {
    const t = threads.create({ userId: 'u1', title: 'Test', archived: false })
    const raw = db.prepare('SELECT typeof(created_at) as t FROM threads WHERE id = ?').get(t.id) as { t: string }
    expect(raw.t).toBe('text')
  })

  it('threads.updated_at is stored as TEXT, not INTEGER', () => {
    const t = threads.create({ userId: 'u1', title: 'Test', archived: false })
    const raw = db.prepare('SELECT typeof(updated_at) as t FROM threads WHERE id = ?').get(t.id) as { t: string }
    expect(raw.t).toBe('text')
  })

  it('messages.ts is stored as TEXT, not INTEGER', () => {
    const t = threads.create({ userId: 'u1', title: 'Test', archived: false })
    const m = messages.create({ threadId: t.id, role: 'user', content: 'hello' })
    const raw = db.prepare('SELECT typeof(ts) as t FROM messages WHERE id = ?').get(m.id) as { t: string }
    expect(raw.t).toBe('text')
  })

  it('thread timestamps round-trip as valid Dates within 60s of now', () => {
    const before = Date.now()
    const t = threads.create({ userId: 'u1', title: 'Test', archived: false })
    const after = Date.now()
    expect(t.createdAt).toBeInstanceOf(Date)
    expect(t.createdAt.getTime()).toBeGreaterThanOrEqual(before - 60_000)
    expect(t.createdAt.getTime()).toBeLessThanOrEqual(after + 60_000)
  })

  it('thread update changes updated_at to TEXT', () => {
    const t = threads.create({ userId: 'u1', title: 'Old', archived: false })
    threads.update(t.id, { title: 'New' })
    const raw = db.prepare('SELECT typeof(updated_at) as t FROM threads WHERE id = ?').get(t.id) as { t: string }
    expect(raw.t).toBe('text')
  })
})
