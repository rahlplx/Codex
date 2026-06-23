import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { AdapterRegistry } from '../../../backend/src/adapters/registry.js'
import { createModelsRouter } from '../../../backend/src/server/routes/models.js'
import type { ICliAdapter } from '../../../backend/src/types/adapter.js'

function makeAdapter(id: string, models: Array<{ id: string; name: string }>): ICliAdapter {
  return {
    id,
    name: id,
    tier: 'free' as const,
    supportsStreaming: true,
    supportsToolUse: false,
    initialize: async () => {},
    healthCheck: async () => ({ healthy: true, latencyMs: 10, score: 80 }),
    getQuota: async () => ({ unlimited: true, remaining: null, resetAt: null }),
    supportedModels: async () => models.map(m => ({
      ...m,
      contextWindow: 4096,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: false,
    })),
    chatCompletion: async () => ({ id: '1', choices: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, model: '', provider: id }),
    chatCompletionStream: async function* () {},
  }
}

function buildApp(registry: AdapterRegistry) {
  const app = express()
  app.use(express.json())
  app.use(createModelsRouter(registry))
  return app
}

describe('Models API', () => {
  let registry: AdapterRegistry
  let app: express.Express

  beforeEach(() => {
    registry = new AdapterRegistry()
  })

  it('returns empty models array when no adapters registered', async () => {
    app = buildApp(registry)
    const res = await request(app).get('/api/models')
    expect(res.status).toBe(200)
    expect(res.body.models).toEqual([])
    expect(res.body.ts).toBeDefined()
  })

  it('returns models from all registered adapters', async () => {
    registry.register(makeAdapter('alpha', [{ id: 'model-a', name: 'Model A' }]))
    registry.register(makeAdapter('beta', [{ id: 'model-b', name: 'Model B' }, { id: 'model-c', name: 'Model C' }]))
    app = buildApp(registry)

    const res = await request(app).get('/api/models')
    expect(res.status).toBe(200)
    expect(res.body.models).toHaveLength(3)
    expect(res.body.models[0].provider).toBe('alpha')
    expect(res.body.models[1].provider).toBe('beta')
  })

  it('includes provider field on each model', async () => {
    registry.register(makeAdapter('test-provider', [{ id: 'test-model', name: 'Test' }]))
    app = buildApp(registry)

    const res = await request(app).get('/api/models')
    expect(res.body.models[0].provider).toBe('test-provider')
    expect(res.body.models[0].id).toBe('test-model')
  })

  it('handles adapter errors gracefully', async () => {
    const failingAdapter = makeAdapter('failing', [])
    failingAdapter.supportedModels = async () => { throw new Error('offline') }
    registry.register(failingAdapter)
    registry.register(makeAdapter('working', [{ id: 'ok-model', name: 'OK' }]))
    app = buildApp(registry)

    const res = await request(app).get('/api/models')
    expect(res.status).toBe(200)
    expect(res.body.models).toHaveLength(1)
    expect(res.body.models[0].id).toBe('ok-model')
  })
})
