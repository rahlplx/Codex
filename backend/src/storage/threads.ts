import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type { Thread } from '../types/thread.js'

interface ThreadRow {
  id: string
  user_id: string
  title: string
  created_at: number
  updated_at: number
  archived: number
}

function rowToThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    archived: row.archived !== 0,
  }
}

export class ThreadRepository {
  constructor(private readonly db: Database) {}

  create(input: { userId: string; title: string; archived: boolean }): Thread {
    const id = randomUUID()
    const now = Date.now()
    this.db.prepare(`
      INSERT INTO threads (id, user_id, title, created_at, updated_at, archived)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.userId, input.title, now, now, input.archived ? 1 : 0)
    return this.findById(id)!
  }

  findById(id: string): Thread | null {
    const row = this.db.prepare<string, ThreadRow>(
      'SELECT * FROM threads WHERE id = ?'
    ).get(id)
    return row ? rowToThread(row) : null
  }

  list(userId: string): Thread[] {
    const rows = this.db.prepare<string, ThreadRow>(
      'SELECT * FROM threads WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId)
    return rows.map(rowToThread)
  }

  update(id: string, patch: Partial<Pick<Thread, 'title' | 'archived'>>): Thread | null {
    const existing = this.findById(id)
    if (!existing) return null

    const title = patch.title ?? existing.title
    const archived = patch.archived ?? existing.archived
    const now = Date.now()

    this.db.prepare(`
      UPDATE threads SET title = ?, archived = ?, updated_at = ? WHERE id = ?
    `).run(title, archived ? 1 : 0, now, id)

    return this.findById(id)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM threads WHERE id = ?').run(id)
    return result.changes > 0
  }
}
