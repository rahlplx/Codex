import type Database from 'better-sqlite3';
import { migration001 } from './001-initial.js';
import { migration002 } from './002-threads.js';

interface Migration {
  version: number;
  name: string;
  up(db: Database.Database): void;
}

const migrations: Migration[] = [migration001, migration002];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => (row as { version: number }).version),
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name,
      );
    })();

    console.log(`Applied migration ${migration.version}: ${migration.name}`);
  }
}
