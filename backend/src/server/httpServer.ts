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

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
}

export function createApp(registry?: AdapterRegistry, db?: Database): express.Application {
  const reg = registry ?? new AdapterRegistry()
  const app = express()

  app.use(corsMiddleware)
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

  return app
}
