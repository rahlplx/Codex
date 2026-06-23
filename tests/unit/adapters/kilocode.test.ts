import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KiloCodeAdapter } from '../../../backend/src/adapters/kilocode.js'

describe('KiloCodeAdapter — static identity', () => {
  const adapter = new KiloCodeAdapter()

  it('has correct id', () => expect(adapter.id).toBe('kilocode'))
  it('has correct name', () => expect(adapter.name).toBe('KiloCode'))
  it('is free tier', () => expect(adapter.tier).toBe('free'))
  it('supports streaming', () => expect(adapter.supportsStreaming).toBe(true))
  it('supports tool use', () => expect(adapter.supportsToolUse).toBe(true))
})

describe('KiloCodeAdapter — getQuota', () => {
  it('returns unlimited quota', async () => {
    const adapter = new KiloCodeAdapter()
    const quota = await adapter.getQuota()
    expect(quota.unlimited).toBe(true)
    expect(quota.remaining).toBeNull()
  })
})

describe('KiloCodeAdapter — supportedModels', () => {
  const adapter = new KiloCodeAdapter()

  it('returns a non-empty list', async () => {
    const models = await adapter.supportedModels()
    expect(models.length).toBeGreaterThan(0)
  })

  it('includes kilo-coder-latest', async () => {
    const models = await adapter.supportedModels()
    expect(models.some(m => m.id === 'kilo-coder-latest')).toBe(true)
  })

  it('kilo-coder-latest supports reasoning', async () => {
    const models = await adapter.supportedModels()
    const latest = models.find(m => m.id === 'kilo-coder-latest')
    expect(latest?.supportsReasoning).toBe(true)
  })

  it('all models have positive contextWindow', async () => {
    const models = await adapter.supportedModels()
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0)
    }
  })
})

describe('KiloCodeAdapter — chatCompletion', () => {
  let adapter: KiloCodeAdapter

  beforeEach(async () => {
    adapter = new KiloCodeAdapter()
    await adapter.initialize({ apiKey: 'test-key' })
  })

  it('POSTs to the correct endpoint', async () => {
    const mockResponse = {
      id: 'kilo-123',
      choices: [{ message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hi' }] })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toContain('/chat/completions')

    vi.unstubAllGlobals()
  })

  it('uses kilo-coder-latest as default model', async () => {
    const mockResponse = {
      id: 'kilo-123',
      choices: [{ message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hi' }] })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.model).toBe('kilo-coder-latest')

    vi.unstubAllGlobals()
  })

  it('sends Authorization header when API key configured', async () => {
    const mockResponse = {
      id: 'kilo-123',
      choices: [{ message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hi' }] })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].headers['Authorization']).toBe('Bearer test-key')

    vi.unstubAllGlobals()
  })

  it('parses response into ChatCompletionResponse shape', async () => {
    const mockResponse = {
      id: 'kilo-456',
      model: 'kilo-coder-latest',
      choices: [{ message: { role: 'assistant', content: 'World' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    const res = await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(res.id).toBe('kilo-456')
    expect(res.choices[0]?.message.content).toBe('World')
    expect(res.usage.totalTokens).toBe(15)
    expect(res.provider).toBe('kilocode')

    vi.unstubAllGlobals()
  })

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }))

    await expect(adapter.chatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
    })).rejects.toThrow('500')

    vi.unstubAllGlobals()
  })
})
