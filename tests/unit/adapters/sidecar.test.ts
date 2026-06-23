import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NineRouterAdapter } from '../../../backend/src/adapters/nine-router.js'
import { CliRelayAdapter } from '../../../backend/src/adapters/cli-relay.js'
import { CliProxyApiAdapter } from '../../../backend/src/adapters/cli-proxy-api.js'
import { AiClient2ApiAdapter } from '../../../backend/src/adapters/ai-client2api.js'

const SIDECARS = [
  { Ctor: NineRouterAdapter, id: 'nine-router', name: '9Router', modelCount: 1 },
  { Ctor: CliRelayAdapter, id: 'cli-relay', name: 'CliRelay', modelCount: 3 },
  { Ctor: CliProxyApiAdapter, id: 'cli-proxy-api', name: 'CLIProxyAPI', modelCount: 3 },
  { Ctor: AiClient2ApiAdapter, id: 'ai-client2api', name: 'AIClient2API', modelCount: 3 },
] as const

describe.each(SIDECARS)('$name adapter — identity', ({ Ctor, id, name }) => {
  const adapter = new Ctor()

  it(`has id "${id}"`, () => expect(adapter.id).toBe(id))
  it(`has name "${name}"`, () => expect(adapter.name).toBe(name))
  it('is free tier', () => expect(adapter.tier).toBe('free'))
  it('supports streaming', () => expect(adapter.supportsStreaming).toBe(true))
})

describe.each(SIDECARS)('$name adapter — quota', ({ Ctor }) => {
  it('returns unlimited quota', async () => {
    const adapter = new Ctor()
    const quota = await adapter.getQuota()
    expect(quota.unlimited).toBe(true)
    expect(quota.remaining).toBeNull()
  })
})

describe.each(SIDECARS)('$name adapter — supportedModels', ({ Ctor, modelCount }) => {
  it(`returns ${modelCount} fallback models`, async () => {
    const adapter = new Ctor()
    const models = await adapter.supportedModels()
    expect(models).toHaveLength(modelCount)
  })

  it('all models have positive contextWindow', async () => {
    const adapter = new Ctor()
    const models = await adapter.supportedModels()
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0)
    }
  })
})

describe.each(SIDECARS)('$name adapter — healthCheck', ({ Ctor }) => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns healthy when sidecar responds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const adapter = new Ctor()
    const health = await adapter.healthCheck()
    expect(health.healthy).toBe(true)
    expect(health.score).toBe(80)
  })

  it('returns unhealthy on connection error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const adapter = new Ctor()
    const health = await adapter.healthCheck()
    expect(health.healthy).toBe(false)
    expect(health.error).toContain('ECONNREFUSED')
  })
})

describe.each(SIDECARS)('$name adapter — chatCompletion', ({ Ctor, id }) => {
  let adapter: InstanceType<typeof Ctor>

  beforeEach(() => {
    adapter = new Ctor()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends request to /chat/completions', async () => {
    const mockResponse = {
      id: 'resp-1',
      model: 'test-model',
      choices: [{ message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    const res = await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hello' }] })
    expect(res.choices[0]?.message.content).toBe('Hi')
    expect(res.provider).toBe(id)
    expect(res.usage.totalTokens).toBe(6)
  })
})

describe.each(SIDECARS)('$name adapter — chatCompletionStream', ({ Ctor }) => {
  let adapter: InstanceType<typeof Ctor>

  beforeEach(() => {
    adapter = new Ctor()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('yields chunks from SSE stream', async () => {
    const chunk = { id: 'c1', choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' }, finishReason: null }] }
    const encoder = new TextEncoder()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n`))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }))

    const chunks: any[] = []
    for await (const c of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hello' }] })) {
      chunks.push(c)
    }
    expect(chunks).toHaveLength(1)
    expect(chunks[0].choices[0].delta.content).toBe('Hi')
  })

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, body: null }))
    const gen = adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hi' }] })
    await expect((async () => { for await (const _ of gen) {} })()).rejects.toThrow('503')
  })
})

describe('Sidecar — dynamic model discovery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses /models endpoint when available', async () => {
    const modelList = { data: [{ id: 'dynamic-model-1' }, { id: 'dynamic-model-2' }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(modelList),
    }))

    const adapter = new NineRouterAdapter()
    const models = await adapter.supportedModels()
    expect(models).toHaveLength(2)
    expect(models[0].id).toBe('dynamic-model-1')
  })

  it('falls back to static models on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const adapter = new NineRouterAdapter()
    const models = await adapter.supportedModels()
    expect(models).toHaveLength(1)
    expect(models[0].id).toBe('auto')
  })
})
