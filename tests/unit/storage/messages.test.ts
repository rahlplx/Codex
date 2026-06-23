import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabase } from '../../../backend/src/storage/database'
import { ThreadRepository } from '../../../backend/src/storage/threads'
import { MessageRepository } from '../../../backend/src/storage/messages'
import type { Database } from 'better-sqlite3'

let db: Database
let threads: ThreadRepository
let messages: MessageRepository

beforeEach(() => {
  db = openDatabase(':memory:')
  threads = new ThreadRepository(db)
  messages = new MessageRepository(db)
})

function seedThread(userId = 'u1') {
  return threads.create({ userId, title: 'Test thread', archived: false })
}

describe('MessageRepository.create', () => {
  it('returns a message with the supplied fields', () => {
    const t = seedThread()
    const m = messages.create({ threadId: t.id, role: 'user', content: 'hello' })
    expect(m.threadId).toBe(t.id)
    expect(m.role).toBe('user')
    expect(m.content).toBe('hello')
  })

  it('assigns a non-empty id', () => {
    const t = seedThread()
    const m = messages.create({ threadId: t.id, role: 'user', content: 'hi' })
    expect(typeof m.id).toBe('string')
    expect(m.id.length).toBeGreaterThan(0)
  })

  it('sets ts as a Date instance', () => {
    const t = seedThread()
    const m = messages.create({ threadId: t.id, role: 'user', content: 'hi' })
    expect(m.ts).toBeInstanceOf(Date)
  })

  it('stores optional providerId and modelId', () => {
    const t = seedThread()
    const m = messages.create({
      threadId: t.id, role: 'assistant', content: 'ok',
      providerId: 'opencode-zen', modelId: 'big-pickle',
    })
    expect(m.providerId).toBe('opencode-zen')
    expect(m.modelId).toBe('big-pickle')
  })

  it('stores null providerId and modelId when omitted', () => {
    const t = seedThread()
    const m = messages.create({ threadId: t.id, role: 'user', content: 'hi' })
    expect(m.providerId).toBeUndefined()
    expect(m.modelId).toBeUndefined()
  })
})

describe('MessageRepository.listByThread', () => {
  it('returns messages in insertion order', () => {
    const t = seedThread()
    messages.create({ threadId: t.id, role: 'user', content: 'first' })
    messages.create({ threadId: t.id, role: 'assistant', content: 'second' })
    const list = messages.listByThread(t.id)
    expect(list).toHaveLength(2)
    expect(list[0]!.content).toBe('first')
    expect(list[1]!.content).toBe('second')
  })

  it('returns empty array for unknown thread', () => {
    expect(messages.listByThread('no-thread')).toHaveLength(0)
  })

  it('only returns messages for the specified thread', () => {
    const t1 = seedThread()
    const t2 = seedThread()
    messages.create({ threadId: t1.id, role: 'user', content: 'for t1' })
    messages.create({ threadId: t2.id, role: 'user', content: 'for t2' })
    expect(messages.listByThread(t1.id)).toHaveLength(1)
    expect(messages.listByThread(t2.id)).toHaveLength(1)
  })
})

describe('MessageRepository.findById', () => {
  it('returns the message after creation', () => {
    const t = seedThread()
    const m = messages.create({ threadId: t.id, role: 'user', content: 'hi' })
    const found = messages.findById(m.id)
    expect(found).not.toBeNull()
    expect(found!.content).toBe('hi')
  })

  it('returns null for unknown id', () => {
    expect(messages.findById('nope')).toBeNull()
  })
})

describe('MessageRepository.delete', () => {
  it('removes the message', () => {
    const t = seedThread()
    const m = messages.create({ threadId: t.id, role: 'user', content: 'bye' })
    expect(messages.delete(m.id)).toBe(true)
    expect(messages.findById(m.id)).toBeNull()
  })

  it('returns false for unknown id', () => {
    expect(messages.delete('nope')).toBe(false)
  })
})

describe('cascade delete', () => {
  it('deleting a thread removes its messages', () => {
    const t = seedThread()
    const m = messages.create({ threadId: t.id, role: 'user', content: 'hi' })
    threads.delete(t.id)
    expect(messages.findById(m.id)).toBeNull()
  })
})
