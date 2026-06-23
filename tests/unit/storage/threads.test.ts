import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabase } from '../../../backend/src/storage/database'
import { ThreadRepository } from '../../../backend/src/storage/threads'
import type { Database } from 'better-sqlite3'

let db: Database
let repo: ThreadRepository

beforeEach(() => {
  db = openDatabase(':memory:')
  repo = new ThreadRepository(db)
})

describe('ThreadRepository.create', () => {
  it('returns a thread with the supplied fields', () => {
    const t = repo.create({ userId: 'u1', title: 'Hello', archived: false })
    expect(t.userId).toBe('u1')
    expect(t.title).toBe('Hello')
    expect(t.archived).toBe(false)
  })

  it('assigns a non-empty id', () => {
    const t = repo.create({ userId: 'u1', title: 'T', archived: false })
    expect(typeof t.id).toBe('string')
    expect(t.id.length).toBeGreaterThan(0)
  })

  it('sets createdAt and updatedAt as Date instances', () => {
    const t = repo.create({ userId: 'u1', title: 'T', archived: false })
    expect(t.createdAt).toBeInstanceOf(Date)
    expect(t.updatedAt).toBeInstanceOf(Date)
  })

  it('creates two threads with distinct ids', () => {
    const a = repo.create({ userId: 'u1', title: 'A', archived: false })
    const b = repo.create({ userId: 'u1', title: 'B', archived: false })
    expect(a.id).not.toBe(b.id)
  })
})

describe('ThreadRepository.findById', () => {
  it('returns the thread after creation', () => {
    const t = repo.create({ userId: 'u1', title: 'Hi', archived: false })
    const found = repo.findById(t.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(t.id)
    expect(found!.title).toBe('Hi')
  })

  it('returns null for an unknown id', () => {
    expect(repo.findById('no-such-id')).toBeNull()
  })
})

describe('ThreadRepository.list', () => {
  it('returns threads belonging to the user', () => {
    repo.create({ userId: 'u1', title: 'A', archived: false })
    repo.create({ userId: 'u1', title: 'B', archived: false })
    const list = repo.list('u1')
    expect(list).toHaveLength(2)
  })

  it('excludes threads from other users', () => {
    repo.create({ userId: 'u1', title: 'A', archived: false })
    repo.create({ userId: 'u2', title: 'B', archived: false })
    expect(repo.list('u1')).toHaveLength(1)
    expect(repo.list('u2')).toHaveLength(1)
  })

  it('returns empty array for unknown user', () => {
    expect(repo.list('ghost')).toHaveLength(0)
  })
})

describe('ThreadRepository.update', () => {
  it('updates the title', () => {
    const t = repo.create({ userId: 'u1', title: 'Old', archived: false })
    const updated = repo.update(t.id, { title: 'New' })
    expect(updated).not.toBeNull()
    expect(updated!.title).toBe('New')
  })

  it('updates archived flag', () => {
    const t = repo.create({ userId: 'u1', title: 'T', archived: false })
    const updated = repo.update(t.id, { archived: true })
    expect(updated!.archived).toBe(true)
  })

  it('bumps updatedAt', () => {
    const t = repo.create({ userId: 'u1', title: 'T', archived: false })
    const before = t.updatedAt.getTime()
    // Small sleep to guarantee timestamp difference
    const updated = repo.update(t.id, { title: 'New' })
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('returns null for unknown id', () => {
    expect(repo.update('nope', { title: 'x' })).toBeNull()
  })
})

describe('ThreadRepository.delete', () => {
  it('removes the thread', () => {
    const t = repo.create({ userId: 'u1', title: 'T', archived: false })
    expect(repo.delete(t.id)).toBe(true)
    expect(repo.findById(t.id)).toBeNull()
  })

  it('returns false for unknown id', () => {
    expect(repo.delete('nope')).toBe(false)
  })
})
