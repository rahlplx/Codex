import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { OpenCodeZenAdapter } from '../../../backend/src/adapters/opencode-zen'

// ── helpers ───────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    body: null,
  }))
}

function mockFetchError(message: string): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)))
}

function mockSSE(lines: string[]): void {
  const encoder = new TextEncoder()
  const chunks = lines.map(l => encoder.encode(l + '\n'))
  let i = 0
  const stream = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++])
      } else {
        controller.close()
      }
    },
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, status: 200, statusText: 'OK',
    body: stream,
    json: () => Promise.reject(new Error('not json')),
  }))
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('OpenCodeZenAdapter — static identity', () => {
  const adapter = new OpenCodeZenAdapter()

  it('has correct id', () => expect(adapter.id).toBe('opencode-zen'))
  it('has correct name', () => expect(adapter.name).toBe('OpenCode Zen'))
  it('is free tier', () => expect(adapter.tier).toBe('free'))
  it('supports streaming', () => expect(adapter.supportsStreaming).toBe(true))
  it('does not claim tool use', () => expect(adapter.supportsToolUse).toBe(false))
})

describe('OpenCodeZenAdapter — getQuota', () => {
  let adapter: OpenCodeZenAdapter

  beforeEach(async () => {
    adapter = new OpenCodeZenAdapter()
    await adapter.initialize({})
  })

  it('returns unlimited quota when no API key configured', async () => {
    const quota = await adapter.getQuota()
    expect(quota.unlimited).toBe(true)
    expect(quota.remaining).toBeNull()
    expect(quota.resetAt).toBeNull()
  })

  it('returns remaining: null (unknown) when API key configured', async () => {
    await adapter.initialize({ apiKey: 'sk-test-key' })
    const quota = await adapter.getQuota()
    expect(quota.unlimited).toBe(false)
    expect(quota.remaining).toBeNull()
  })
})

describe('OpenCodeZenAdapter — supportedModels', () => {
  const adapter = new OpenCodeZenAdapter()

  it('returns a non-empty list', async () => {
    const models = await adapter.supportedModels()
    expect(models.length).toBeGreaterThan(0)
  })

  it('includes big-pickle', async () => {
    const models = await adapter.supportedModels()
    const ids = models.map(m => m.id)
    expect(ids).toContain('big-pickle')
  })

  it('big-pickle supports reasoning', async () => {
    const models = await adapter.supportedModels()
    const pickle = models.find(m => m.id === 'big-pickle')
    expect(pickle?.supportsReasoning).toBe(true)
  })

  it('all models have positive contextWindow', async () => {
    const models = await adapter.supportedModels()
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0)
    }
  })
})

describe('OpenCodeZenAdapter — healthCheck', () => {
  let adapter: OpenCodeZenAdapter

  afterEach(() => { vi.unstubAllGlobals() })

  beforeEach(async () => {
    adapter = new OpenCodeZenAdapter()
    await adapter.initialize({})
  })

  it('returns healthy when models resolve', async () => {
    // supportedModels uses a static list (no fetch), so this always works
    const status = await adapter.healthCheck()
    expect(status.healthy).toBe(true)
    expect(status.latencyMs).toBeGreaterThanOrEqual(0)
    expect(status.score).toBeGreaterThan(0)
    expect(status.score).toBeLessThanOrEqual(100)
  })

  it('score is 1 for near-instant response', async () => {
    const status = await adapter.healthCheck()
    // With static models, latency ≈ 0 → score should be very close to 100
    expect(status.score).toBeGreaterThan(99)
  })
})

describe('OpenCodeZenAdapter — chatCompletion', () => {
  let adapter: OpenCodeZenAdapter

  afterEach(() => { vi.unstubAllGlobals() })

  beforeEach(async () => {
    adapter = new OpenCodeZenAdapter()
    await adapter.initialize({})
  })

  it('POSTs to the correct endpoint', async () => {
    mockFetch({
      id: 'zen-1',
      choices: [{ message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    })

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] })

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://opencode.ai/zen/v1/chat/completions')
    expect(init.method).toBe('POST')
  })

  it('uses big-pickle as default model', async () => {
    mockFetch({ id: 'r', choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('big-pickle')
  })

  it('uses caller-specified model when provided', async () => {
    mockFetch({ id: 'r', choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })

    await adapter.chatCompletion({ model: 'deepseek-v4-flash-free', messages: [{ role: 'user', content: 'hi' }] })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('deepseek-v4-flash-free')
  })

  it('parses response into ChatCompletionResponse shape', async () => {
    mockFetch({
      id: 'zen-42',
      choices: [{ message: { role: 'assistant', content: 'world' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
      model: 'big-pickle',
    })

    const res = await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] })

    expect(res.id).toBe('zen-42')
    expect(res.choices[0]?.message.content).toBe('world')
    expect(res.choices[0]?.finishReason).toBe('stop')
    expect(res.usage.promptTokens).toBe(8)
    expect(res.usage.completionTokens).toBe(4)
    expect(res.usage.totalTokens).toBe(12)
    expect(res.provider).toBe('opencode-zen')
  })

  it('sends Authorization header when API key configured', async () => {
    await adapter.initialize({ apiKey: 'sk-my-key' })
    mockFetch({ id: 'r', choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'test' }] })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-my-key')
  })

  it('does NOT send Authorization header without API key', async () => {
    mockFetch({ id: 'r', choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'test' }] })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })

  it('uses custom baseUrl from config', async () => {
    await adapter.initialize({ baseUrl: 'http://localhost:9999/zen/v1' })
    mockFetch({ id: 'r', choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'test' }] })

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:9999/zen/v1/chat/completions')
  })

  it('throws on HTTP error', async () => {
    mockFetch({ error: 'rate limited' }, 429)

    await expect(
      adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('HTTP 429')
  })

  it('sets stream: false in non-streaming request body', async () => {
    mockFetch({ id: 'r', choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.stream).toBe(false)
  })
})

describe('OpenCodeZenAdapter — chatCompletionStream', () => {
  let adapter: OpenCodeZenAdapter

  afterEach(() => { vi.unstubAllGlobals() })

  beforeEach(async () => {
    adapter = new OpenCodeZenAdapter()
    await adapter.initialize({})
  })

  it('yields chunks from SSE response', async () => {
    mockSSE([
      'data: {"id":"s1","choices":[{"delta":{"content":"hel"},"finish_reason":null}]}',
      'data: {"id":"s1","choices":[{"delta":{"content":"lo"},"finish_reason":null}]}',
      'data: [DONE]',
    ])

    const chunks: string[] = []
    for await (const chunk of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk.choices[0]?.delta.content ?? '')
    }

    expect(chunks).toEqual(['hel', 'lo'])
  })

  it('stops at [DONE]', async () => {
    mockSSE([
      'data: {"id":"s2","choices":[{"delta":{"content":"one"},"finish_reason":null}]}',
      'data: [DONE]',
      'data: {"id":"s2","choices":[{"delta":{"content":"never"},"finish_reason":null}]}',
    ])

    const chunks: string[] = []
    for await (const chunk of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk.choices[0]?.delta.content ?? '')
    }

    expect(chunks).toEqual(['one'])
  })

  it('sets stream: true in request body', async () => {
    mockSSE(['data: [DONE]'])

    // consume the stream
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'hi' }] })) {}

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.stream).toBe(true)
  })

  it('skips malformed SSE lines without throwing', async () => {
    mockSSE([
      'data: not-json{{{{',
      'data: {"id":"s3","choices":[{"delta":{"content":"ok"},"finish_reason":null}]}',
      'data: [DONE]',
    ])

    const chunks: string[] = []
    for await (const chunk of adapter.chatCompletionStream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk.choices[0]?.delta.content ?? '')
    }

    expect(chunks).toEqual(['ok'])
  })
})
