import BetterSqlite3 from 'better-sqlite3'
import type { Database } from 'better-sqlite3'

export { Database }

export function openDatabase(path: string): Database {
  const db = new BetterSqlite3(path)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT
    );

    CREATE TABLE IF NOT EXISTS tenant_keys (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      key_encrypted BLOB NOT NULL,
      key_label TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      success INTEGER NOT NULL DEFAULT 1,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS threads (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      thread_id   TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      role        TEXT NOT NULL CHECK (role IN ('system','user','assistant')),
      content     TEXT NOT NULL,
      provider_id TEXT,
      model_id    TEXT,
      ts          INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
    CREATE INDEX IF NOT EXISTS idx_tenant_keys_tenant ON tenant_keys(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_usage_log_tenant ON usage_log(tenant_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_log_provider ON usage_log(provider, timestamp);
    CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, ts ASC);
  `)

  return db
}
