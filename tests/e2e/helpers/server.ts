import type { Server } from 'node:http'
import type { Database } from 'better-sqlite3'
import { AdapterRegistry } from '../../../backend/src/adapters/registry.js'
import { openDatabase } from '../../../backend/src/storage/database.js'
import { createApp } from '../../../backend/src/server/httpServer.js'
import type { MockAdapter } from '../fixtures/mock-adapter.js'

export interface SimServer {
  baseUrl: string
  server: Server
  db: Database
  registry: AdapterRegistry
  mock: MockAdapter
}

export async function startSimServer(mock: MockAdapter): Promise<SimServer> {
  const registry = new AdapterRegistry()
  registry.register(mock)
  const db = openDatabase(':memory:')
  const app = createApp(registry, db)

  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr !== 'object') {
        reject(new Error('No address returned from listen()'))
        return
      }
      resolve({ baseUrl: `http://127.0.0.1:${addr.port}`, server, db, registry, mock })
    })
    server.on('error', reject)
  })
}

export function stopSimServer(s: SimServer): Promise<void> {
  return new Promise((resolve, reject) => {
    s.server.close(err => {
      try { s.db.close() } catch { /* already closed */ }
      err ? reject(err) : resolve()
    })
  })
}
