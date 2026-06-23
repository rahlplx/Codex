import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import { healthRouter } from '../../../backend/src/server/routes/health.js'

describe('GET /health', () => {
  const app = express()
  app.use(healthRouter)

  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('includes a valid ISO timestamp', async () => {
    const res = await request(app).get('/health')
    expect(res.body.ts).toBeDefined()
    const parsed = new Date(res.body.ts as string)
    expect(parsed.toISOString()).toBe(res.body.ts)
  })
})
