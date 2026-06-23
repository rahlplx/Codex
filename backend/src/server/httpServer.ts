import express from 'express'
import type { Database } from 'better-sqlite3'
import { AdapterRegistry } from '../adapters/registry'
import { healthRouter } from './routes/health'
import { createProvidersRouter } from './routes/providers'
import { createModelsRouter } from './routes/models'
import { createChatRouter } from './routes/chat'
import { createThreadsRouter } from './routes/threads'

export function createApp(registry?: AdapterRegistry, db?: Database): express.Application {
  const reg = registry ?? new AdapterRegistry()
  const app = express()

  app.use(express.json())

  app.use(healthRouter)
  app.use(createProvidersRouter(reg))
  app.use(createModelsRouter(reg))
  app.use(createChatRouter(reg))
  if (db) app.use(createThreadsRouter(db))

  return app
}
