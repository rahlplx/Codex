import express from 'express'
import type { Database } from 'better-sqlite3'
import { AdapterRegistry } from '../adapters/registry.js'
import { healthRouter } from './routes/health.js'
import { createProvidersRouter } from './routes/providers.js'
import { createModelsRouter } from './routes/models.js'
import { createChatRouter } from './routes/chat.js'
import { createThreadsRouter } from './routes/threads.js'
import { createAuthRouter } from './routes/auth.js'
import { createAdminRouter } from './routes/admin.js'
import { createTelemetryRouter } from './routes/telemetry.js'

export function createApp(registry?: AdapterRegistry, db?: Database): express.Application {
  const reg = registry ?? new AdapterRegistry()
  const app = express()

  app.use(express.json())

  app.use(healthRouter)
  app.use(createProvidersRouter(reg))
  app.use(createModelsRouter(reg))
  app.use(createChatRouter(reg))
  if (db) {
    app.use(createThreadsRouter(db))
    app.use(createAuthRouter(db))
    app.use(createAdminRouter(db))
    app.use(createTelemetryRouter(db))
  }

  return app
}
