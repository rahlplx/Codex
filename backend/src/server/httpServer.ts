import express from 'express'
import type { Database } from 'better-sqlite3'
import { AdapterRegistry } from '../adapters/registry'
import { healthRouter } from './routes/health'
import { createProvidersRouter } from './routes/providers'
import { createModelsRouter } from './routes/models'
import { createChatRouter } from './routes/chat'
import { createThreadsRouter } from './routes/threads'
import { createAuthRouter } from './routes/auth'
import { createAdminRouter } from './routes/admin'
import { createTelemetryRouter } from './routes/telemetry'

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
