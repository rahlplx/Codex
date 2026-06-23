import type Database from 'better-sqlite3';

export const migration001 = {
  version: 1,
  name: 'initial-schema',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE tenants (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now')),
        last_active TEXT
      );

      CREATE TABLE tenant_keys (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        key_encrypted BLOB NOT NULL,
        key_label TEXT,
        auth_type TEXT NOT NULL DEFAULT 'api_key',
        oauth_tokens_encrypted BLOB,
        oauth_expires_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE usage_log (
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

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        refresh_token_hash TEXT NOT NULL,
        device_fingerprint TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );

      CREATE TABLE model_catalog (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        score REAL NOT NULL DEFAULT 50,
        latency_p50 INTEGER,
        success_rate REAL,
        last_seen TEXT,
        discovered_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_tenant_keys_tenant ON tenant_keys(tenant_id);
      CREATE INDEX idx_usage_log_tenant ON usage_log(tenant_id, timestamp);
      CREATE INDEX idx_usage_log_provider ON usage_log(provider, timestamp);
      CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
      CREATE INDEX idx_model_catalog_score ON model_catalog(score DESC);
    `);
  },
};
