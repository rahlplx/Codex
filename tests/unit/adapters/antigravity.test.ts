import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AntigravityAdapter } from '../../../backend/src/adapters/antigravity.js'

describe('AntigravityAdapter — static identity', () => {
  const adapter = new AntigravityAdapter()

  it('has correct id', () => expect(adapter.id).toBe('antigravity'))
  it('has correct name', () => expect(adapter.name).toContain('Gemini'))
  it('is freemium tier', () => expect(adapter.tier).toBe('freemium'))
  it('supports streaming', () => expect(adapter.supportsStreaming).toBe(true))
  it('does not support tool use', () => expect(adapter.supportsToolUse).toBe(false))
})

describe('AntigravityAdapter — getQuota', () => {
  it('returns remaining: 0 when no API key configured', async () => {
    const adapter = new AntigravityAdapter()
    const quota = await adapter.getQuota()
    expect(quota.remaining).toBe(0)
    expect(quota.unlimited).toBe(false)
  })

  it('returns remaining: null (unknown) when API key configured', async () => {
    const adapter = new AntigravityAdapter()
    await adapter.initialize({ apiKey: 'test-key' })
    const quota = await adapter.getQuota()
    expect(quota.remaining).toBeNull()
  })
})

describe('AntigravityAdapter — supportedModels', () => {
  const adapter = new AntigravityAdapter()

  it('returns a non-empty list', async () => {
    const models = await adapter.supportedModels()
    expect(models.length).toBeGreaterThan(0)
  })

  it('includes gemini-2.5-flash-preview', async () => {
    const models = await adapter.supportedModels()
    expect(models.some(m => m.id === 'gemini-2.5-flash-preview')).toBe(true)
  })

  it('gemini models support tool use', async () => {
    const models = await adapter.supportedModels()
    const flash = models.find(m => m.id === 'gemini-2.5-flash-preview')
    expect(flash?.supportsToolUse).toBe(true)
  })

  it('all models have positive contextWindow', async () => {
    const models = await adapter.supportedModels()
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0)
    }
  })
})

describe('AntigravityAdapter — healthCheck', () => {
  it('returns unhealthy when no API key configured', async () => {
    const adapter = new AntigravityAdapter()
    const health = await adapter.healthCheck()
    expect(health.healthy).toBe(false)
    expect(health.error).toContain('No API key')
  })
})

describe('AntigravityAdapter — chatCompletion', () => {
  let adapter: AntigravityAdapter

  beforeEach(async () => {
    adapter = new AntigravityAdapter()
    await adapter.initialize({ apiKey: 'test-key' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to the correct endpoint', async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: 'Hello' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1, totalTokenCount: 6 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hi' }] })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toContain('generateContent')
    expect(call[0]).toContain('key=test-key')
  })

  it('uses gemini-2.5-flash-preview as default model', async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: 'Hello' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1, totalTokenCount: 6 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hi' }] })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toContain('gemini-2.5-flash-preview')
  })

  it('parses response into ChatCompletionResponse shape', async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: 'World' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    const res = await adapter.chatCompletion({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(res.choices[0]?.message.content).toBe('World')
    expect(res.choices[0]?.finishReason).toBe('stop')
    expect(res.usage.totalTokens).toBe(15)
    expect(res.provider).toBe('antigravity')
  })

  it('maps system messages to systemInstruction', async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1, totalTokenCount: 6 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    await adapter.chatCompletion({
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hi' },
      ],
    })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.systemInstruction).toBeDefined()
    expect(body.systemInstruction.parts[0].text).toBe('You are helpful')
    expect(body.contents).toHaveLength(1)
  })

  it('throws when no API key configured', async () => {
    const noKeyAdapter = new AntigravityAdapter()
    await expect(noKeyAdapter.chatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
    })).rejects.toThrow('API key is not configured')
  })
})

describe('AntigravityAdapter — chatCompletionStream', () => {
  let adapter: AntigravityAdapter

  beforeEach(async () => {
    adapter = new AntigravityAdapter()
    await adapter.initialize({ apiKey: 'test-key' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function makeSSEStream(events: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    const data = events.join('\n') + '\n'
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data))
        controller.close()
      },
    })
  }

  it('yields chunks from SSE stream', async () => {
    const body = makeSSEStream([
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]},"finishReason":"STOP"}]}',
    ])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }))

    const chunks: any[] = []
    for await (const chunk of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hi' }] })) {
      chunks.push(chunk)
    }
    expect(chunks).toHaveLength(1)
    expect(chunks[0].choices[0].delta.content).toBe('Hello')
  })

  it('stops on [DONE] signal', async () => {
    const body = makeSSEStream([
      'data: {"candidates":[{"content":{"parts":[{"text":"A"}]},"finishReason":"STOP"}]}',
      'data: [DONE]',
      'data: {"candidates":[{"content":{"parts":[{"text":"B"}]},"finishReason":"STOP"}]}',
    ])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }))

    const chunks: any[] = []
    for await (const chunk of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hi' }] })) {
      chunks.push(chunk)
    }
    expect(chunks).toHaveLength(1)
  })

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, body: null }))

    const gen = adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hi' }] })
    await expect((async () => { for await (const _ of gen) {} })()).rejects.toThrow('500')
  })

  it('throws when no API key configured', async () => {
    const noKeyAdapter = new AntigravityAdapter()
    const gen = noKeyAdapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hi' }] })
    await expect((async () => { for await (const _ of gen) {} })()).rejects.toThrow('API key is not configured')
  })

  it('sets finishReason to stop for STOP', async () => {
    const body = makeSSEStream([
      'data: {"candidates":[{"content":{"parts":[{"text":"done"}]},"finishReason":"STOP"}]}',
    ])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }))

    const chunks: any[] = []
    for await (const chunk of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hi' }] })) {
      chunks.push(chunk)
    }
    expect(chunks[0].choices[0].finishReason).toBe('stop')
  })

  it('sets finishReason to null for non-STOP', async () => {
    const body = makeSSEStream([
      'data: {"candidates":[{"content":{"parts":[{"text":"partial"}]},"finishReason":"MAX_TOKENS"}]}',
    ])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }))

    const chunks: any[] = []
    for await (const chunk of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'Hi' }] })) {
      chunks.push(chunk)
    }
    expect(chunks[0].choices[0].finishReason).toBeNull()
  })
})
