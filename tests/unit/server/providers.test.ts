import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { AdapterRegistry } from '../../../backend/src/adapters/registry.js'
import { createProvidersRouter } from '../../../backend/src/server/routes/providers.js'
import type { ICliAdapter } from '../../../backend/src/types/adapter.js'
import { generateToken } from '../../../backend/src/auth/jwt.js'

const TEST_TOKEN = generateToken('test-user-1', 'test@example.com', 'user')
const AUTH_HEADER = { 'Authorization': `Bearer ${TEST_TOKEN}` }

function makeAdapter(id: string, overrides?: Partial<ICliAdapter>): ICliAdapter {
  return {
    id,
    name: `Provider ${id}`,
    tier: 'free' as const,
    supportsStreaming: true,
    supportsToolUse: false,
    initialize: async () => {},
    healthCheck: async () => ({ healthy: true, latencyMs: 15, score: 85 }),
    getQuota: async () => ({ unlimited: true, remaining: null, resetAt: null }),
    supportedModels: async () => [{
      id: `${id}-model`,
      name: `${id} Model`,
      contextWindow: 4096,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: false,
    }],
    chatCompletion: async () => ({ id: '1', choices: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, model: '', provider: id }),
    chatCompletionStream: async function* () {},
    ...overrides,
  }
}

function buildApp(registry: AdapterRegistry) {
  const app = express()
  app.use(express.json())
  app.use(createProvidersRouter(registry))
  return app
}

describe('Providers API', () => {
  let registry: AdapterRegistry
  let app: express.Express

  beforeEach(() => {
    registry = new AdapterRegistry()
  })

  it('returns empty providers array when none registered', async () => {
    app = buildApp(registry)
    const res = await request(app).get('/api/providers').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.providers).toEqual([])
    expect(res.body.ts).toBeDefined()
  })

  it('returns all registered providers with health and quota', async () => {
    registry.register(makeAdapter('alpha'))
    registry.register(makeAdapter('beta'))
    app = buildApp(registry)

    const res = await request(app).get('/api/providers').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.providers).toHaveLength(2)
    expect(res.body.providers[0].id).toBe('alpha')
    expect(res.body.providers[0].health.healthy).toBe(true)
    expect(res.body.providers[0].quota.unlimited).toBe(true)
    expect(res.body.providers[0].models).toHaveLength(1)
    expect(res.body.providers[0].enabled).toBe(true)
  })

  it('includes tier and name fields', async () => {
    registry.register(makeAdapter('test', { tier: 'premium' as any, name: 'Test Provider' }))
    app = buildApp(registry)

    const res = await request(app).get('/api/providers').set(AUTH_HEADER)
    expect(res.body.providers[0].name).toBe('Test Provider')
    expect(res.body.providers[0].tier).toBe('premium')
  })

  it('handles health check failures gracefully', async () => {
    registry.register(makeAdapter('failing', {
      healthCheck: async () => { throw new Error('timeout') },
    }))
    app = buildApp(registry)

    const res = await request(app).get('/api/providers').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.providers[0].health.healthy).toBe(false)
    expect(res.body.providers[0].health.error).toContain('timeout')
  })

  it('handles quota failures gracefully', async () => {
    registry.register(makeAdapter('quota-fail', {
      getQuota: async () => { throw new Error('quota error') },
    }))
    app = buildApp(registry)

    const res = await request(app).get('/api/providers').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.providers[0].quota.unlimited).toBe(false)
    expect(res.body.providers[0].quota.remaining).toBeNull()
  })

  it('handles model listing failures gracefully', async () => {
    registry.register(makeAdapter('model-fail', {
      supportedModels: async () => { throw new Error('models error') },
    }))
    app = buildApp(registry)

    const res = await request(app).get('/api/providers').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.providers[0].models).toEqual([])
  })
})
