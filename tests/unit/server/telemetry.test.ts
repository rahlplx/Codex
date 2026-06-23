import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createTelemetryRouter } from '../../../backend/src/server/routes/telemetry.js'
import { openDatabase } from '../../../backend/src/storage/database.js'
import { generateToken } from '../../../backend/src/auth/jwt.js'
import type { Database } from 'better-sqlite3'

function buildApp(db: Database) {
  const app = express()
  app.use(express.json())
  app.use(createTelemetryRouter(db))
  return app
}

function seedUsage(db: Database, tenantId: string, provider: string, model: string, tokensIn: number, tokensOut: number) {
  db.prepare(`
    INSERT INTO usage_log (tenant_id, provider, model, tokens_in, tokens_out, latency_ms, success)
    VALUES (?, ?, ?, ?, ?, 100, 1)
  `).run(tenantId, provider, model, tokensIn, tokensOut)
}

describe('Telemetry API', () => {
  let db: Database
  let app: express.Express
  let token: string

  beforeEach(() => {
    db = openDatabase(':memory:')
    db.prepare('INSERT INTO tenants (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run('t1', 'test@test.com', 'Test', 'hash', 'user')
    app = buildApp(db)
    token = generateToken('t1', 'test@test.com', 'user')
    seedUsage(db, 't1', 'opencode-zen', 'big-pickle', 100, 50)
    seedUsage(db, 't1', 'nemotron', 'nemotron-3-super', 200, 100)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/telemetry/rankings', () => {
    it('returns model rankings', async () => {
      const res = await request(app)
        .get('/api/telemetry/rankings')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/telemetry/rankings')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/telemetry/usage', () => {
    it('returns usage data', async () => {
      const res = await request(app)
        .get('/api/telemetry/usage')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('accepts days parameter', async () => {
      const res = await request(app)
        .get('/api/telemetry/usage?days=30')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
    })

    it('returns 400 for invalid days', async () => {
      const res = await request(app)
        .get('/api/telemetry/usage?days=-1')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(400)
    })

    it('returns 400 for days > 365', async () => {
      const res = await request(app)
        .get('/api/telemetry/usage?days=500')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/telemetry/reliability', () => {
    it('returns provider reliability data', async () => {
      const res = await request(app)
        .get('/api/telemetry/reliability')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })
  })

  describe('GET /api/telemetry/speed', () => {
    it('returns provider speed data', async () => {
      const res = await request(app)
        .get('/api/telemetry/speed')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })
  })

  describe('GET /api/telemetry/summary', () => {
    it('returns summary stats', async () => {
      const res = await request(app)
        .get('/api/telemetry/summary')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.total_requests).toBeDefined()
    })
  })
})
