import BetterSqlite3 from 'better-sqlite3'
import type { Database } from 'better-sqlite3'

export { Database }

export function openDatabase(path: string): Database {
  const db = new BetterSqlite3(path)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived   INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_threads_user
      ON threads(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      thread_id   TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      role        TEXT NOT NULL CHECK (role IN ('system','user','assistant')),
      content     TEXT NOT NULL,
      provider_id TEXT,
      model_id    TEXT,
      ts          INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_thread
      ON messages(thread_id, ts ASC);
  `)

  return db
}
