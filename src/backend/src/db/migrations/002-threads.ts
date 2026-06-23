import type Database from 'better-sqlite3';

export const migration002 = {
  version: 2,
  name: 'threads-and-messages',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title TEXT,
        model TEXT,
        project_path TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        tokens_used INTEGER,
        timestamp TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_threads_tenant ON threads(tenant_id, updated_at);
      CREATE INDEX idx_messages_thread ON messages(thread_id, timestamp);
    `);
  },
};
