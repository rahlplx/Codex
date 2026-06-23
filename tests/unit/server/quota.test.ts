import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../backend/src/server/httpServer.js'
import { AdapterRegistry } from '../../../backend/src/adapters/registry.js'
import { generateToken } from '../../../backend/src/auth/jwt.js'
import { openDatabase } from '../../../backend/src/storage/database.js'
import type { Database } from 'better-sqlite3'
import type {
  ICliAdapter, AdapterConfig, HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk,
} from '../../../backend/src/types/adapter.js'

function makeMockAdapter(): ICliAdapter {
  return {
    id: 'mock',
    name: 'Mock',
    tier: 'free',
    supportsStreaming: false,
    supportsToolUse: false,
    async initialize(_: AdapterConfig) {},
    async shutdown() {},
    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, latencyMs: 5, score: 95 }
    },
    async getQuota(): Promise<QuotaStatus> {
      return { unlimited: true, remaining: null, resetAt: null }
    },
    async supportedModels(): Promise<Model[]> {
      return [{ id: 'test-model', name: 'Test', contextWindow: 4096, supportsStreaming: false, supportsToolUse: false, supportsReasoning: false }]
    },
    async chatCompletion(_req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      return {
        id: 'mock-1',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finishReason: 'stop' }],
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
        model: 'test-model',
        provider: 'mock',
      }
    },
    async *chatCompletionStream(_req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
      yield { id: 'c1', choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' }, finishReason: 'stop' }] }
    },
  }
}

describe('Quota guard on /api/chat/completions', () => {
  let db: Database
  let app: ReturnType<typeof createApp>
  const tenantId = 'quota-test-user'
  const token = generateToken(tenantId, 'quota@test.com', 'user')

  beforeEach(() => {
    db = openDatabase(':memory:')
    db.prepare(`INSERT INTO tenants (id, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(
      tenantId, 'quota@test.com', 'hash', 'user'
    )
    const registry = new AdapterRegistry()
    registry.register(makeMockAdapter())
    app = createApp(registry, db)
  })

  afterEach(() => {
    db.close()
  })

  it('allows request when under quota', async () => {
    const res = await request(app)
      .post('/api/chat/completions')
      .set('Authorization', `Bearer ${token}`)
      .send({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(res.status).not.toBe(429)
  })

  it('returns 429 when daily token quota exceeded', async () => {
    db.prepare(`INSERT INTO usage_log (tenant_id, provider, model, tokens_in, tokens_out) VALUES (?, ?, ?, ?, ?)`).run(
      tenantId, 'mock', 'test-model', 60000, 50000
    )
    const res = await request(app)
      .post('/api/chat/completions')
      .set('Authorization', `Bearer ${token}`)
      .send({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(res.status).toBe(429)
    expect(res.body.error).toContain('quota')
  })

  it('429 response includes used, limit, and resetsAt', async () => {
    db.prepare(`INSERT INTO usage_log (tenant_id, provider, model, tokens_in, tokens_out) VALUES (?, ?, ?, ?, ?)`).run(
      tenantId, 'mock', 'test-model', 60000, 50000
    )
    const res = await request(app)
      .post('/api/chat/completions')
      .set('Authorization', `Bearer ${token}`)
      .send({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(res.body.used).toBeGreaterThanOrEqual(100000)
    expect(res.body.limit).toBe(100000)
    expect(res.body.resetsAt).toBeDefined()
  })

  it('quota is per-tenant — other tenant not blocked', async () => {
    const otherTenantId = 'other-user'
    db.prepare(`INSERT INTO tenants (id, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(
      otherTenantId, 'other@test.com', 'hash', 'user'
    )
    const otherToken = generateToken(otherTenantId, 'other@test.com', 'user')

    db.prepare(`INSERT INTO usage_log (tenant_id, provider, model, tokens_in, tokens_out) VALUES (?, ?, ?, ?, ?)`).run(
      tenantId, 'mock', 'test-model', 60000, 50000
    )

    const blockedRes = await request(app)
      .post('/api/chat/completions')
      .set('Authorization', `Bearer ${token}`)
      .send({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(blockedRes.status).toBe(429)

    const allowedRes = await request(app)
      .post('/api/chat/completions')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(allowedRes.status).not.toBe(429)
  })
})
