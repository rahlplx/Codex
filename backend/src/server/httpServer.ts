import express from 'express'
import type { Request, Response, NextFunction } from 'express'
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

  app.use(express.json({ limit: '1mb' }))

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

  // Global error handler — must be registered after all routes
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status =
      err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400
        ? 400
        : 500
    if (!res.headersSent) {
      res.status(status).json({ error: message })
    }
  })

  return app
}
