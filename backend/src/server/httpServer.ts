import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { Database } from 'better-sqlite3'
import { AdapterRegistry } from '../adapters/registry.js'
import { createHealthRouter } from './routes/health.js'
import { createProvidersRouter } from './routes/providers.js'
import { createModelsRouter } from './routes/models.js'
import { createChatRouter } from './routes/chat.js'
import { createThreadsRouter } from './routes/threads.js'
import { createAuthRouter } from './routes/auth.js'
import { createAdminRouter } from './routes/admin.js'
import { createTelemetryRouter } from './routes/telemetry.js'
import { createRoutingRouter } from './routes/routing.js'
import { createUserAdaptersRouter } from './routes/userAdapters.js'
import { DomainScoreRepository } from '../storage/domainScores.js'
import { TenantAdapterRepository } from '../storage/tenantAdapters.js'
import { UsageLogRepository } from '../storage/usageLog.js'

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

const WILDCARD = ALLOWED_ORIGINS.includes('*')

function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin
  if (WILDCARD) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
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

  // Trust the first proxy hop (Caddy) so req.ip reflects the real client IP
  app.set('trust proxy', 1)
  app.use(corsMiddleware)
  app.use(express.json({ limit: '1mb' }))

  app.use(createHealthRouter(db))
  app.use(createProvidersRouter(reg))
  app.use(createModelsRouter(reg))

  if (db) {
    const domainScores = new DomainScoreRepository(db)
    const tenantAdapters = new TenantAdapterRepository(db)
    const usageLog = new UsageLogRepository(db)
    app.use(createChatRouter(reg, domainScores, tenantAdapters, usageLog))
    app.use(createRoutingRouter(domainScores))
    // auth must come before threads/admin/telemetry — those routers have router.use(authGuard)
    // which intercepts all paths, so /api/auth/* must be handled first
    app.use(createAuthRouter(db))
    app.use(createThreadsRouter(db))
    app.use(createAdminRouter(db))
    app.use(createTelemetryRouter(db))
    app.use(createUserAdaptersRouter(tenantAdapters))
  } else {
    app.use(createChatRouter(reg))
  }

  return app
}
