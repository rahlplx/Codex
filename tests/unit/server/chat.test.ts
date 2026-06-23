import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import { createApp } from '../../../backend/src/server/httpServer'
import { AdapterRegistry } from '../../../backend/src/adapters/registry'
import { generateToken } from '../../../backend/src/auth/jwt'
import type {
  ICliAdapter, AdapterConfig, HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk,
} from '../../../backend/src/types/adapter'

const TEST_TOKEN = generateToken('test-user-1', 'test@example.com', 'user')
const AUTH_HEADER = { 'Authorization': `Bearer ${TEST_TOKEN}` }

// ── mock adapter factory ──────────────────────────────────────────────────────

function makeMockAdapter(overrides: Partial<ICliAdapter> = {}): ICliAdapter {
  return {
    id: 'mock',
    name: 'Mock',
    tier: 'free',
    supportsStreaming: true,
    supportsToolUse: false,
    async initialize(_: AdapterConfig) {},
    async shutdown() {},
    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, latencyMs: 5, score: 0.95 }
    },
    async getQuota(): Promise<QuotaStatus> {
      return { unlimited: true, remaining: null, resetAt: null }
    },
    async supportedModels(): Promise<Model[]> {
      return [{ id: 'big-pickle', name: 'Big Pickle', contextWindow: 131_072, supportsStreaming: true, supportsToolUse: false, supportsReasoning: true }]
    },
    async chatCompletion(_req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      return {
        id: 'mock-1',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hello!' }, finishReason: 'stop' }],
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
        model: 'big-pickle',
        provider: 'mock',
      }
    },
    async *chatCompletionStream(_req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
      yield { id: 'c1', choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' }, finishReason: null }] }
      yield { id: 'c2', choices: [{ index: 0, delta: { content: '!' }, finishReason: 'stop' }] }
    },
    ...overrides,
  }
}

// ── server lifecycle helpers ──────────────────────────────────────────────────

async function startServer(registry: AdapterRegistry): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp(registry)
  return new Promise(resolve => {
    const server = app.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 3001
      resolve({ server, baseUrl: `http://localhost:${port}` })
    })
  })
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())))
}

// ── helpers ───────────────────────────────────────────────────────────────────

function parseSSE(raw: string): Array<{ data: string }> {
  return raw
    .split('\n\n')
    .filter(Boolean)
    .map(block => {
      const dataLine = block.split('\n').find(l => l.startsWith('data:'))
      return { data: dataLine ? dataLine.slice(5).trim() : '' }
    })
    .filter(e => e.data !== '')
}

// ── validation tests (no adapter needed) ─────────────────────────────────────

describe('POST /api/chat/completions — validation', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const registry = new AdapterRegistry()
    registry.register(makeMockAdapter())
    ;({ server, baseUrl } = await startServer(registry))
  })
  afterAll(() => stopServer(server))

  it('returns 400 when messages field is missing', async () => {
    const res = await fetch(`${baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify({ model: 'big-pickle' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/messages/)
  })

  it('returns 400 when messages is not an array', async () => {
    const res = await fetch(`${baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify({ messages: 'hello' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when messages is an empty array', async () => {
    const res = await fetch(`${baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify({ messages: [] }),
    })
    expect(res.status).toBe(400)
  })
})

// ── non-streaming success ─────────────────────────────────────────────────────

describe('POST /api/chat/completions — non-streaming', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const registry = new AdapterRegistry()
    registry.register(makeMockAdapter())
    ;({ server, baseUrl } = await startServer(registry))
  })
  afterAll(() => stopServer(server))

  async function post(body: Record<string, unknown>) {
    return fetch(`${baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(body),
    })
  }

  it('returns 200 for a valid request', async () => {
    const res = await post({ messages: [{ role: 'user', content: 'hi' }] })
    expect(res.status).toBe(200)
  })

  it('response has OpenAI-compatible shape', async () => {
    const res = await post({ messages: [{ role: 'user', content: 'hi' }] })
    const body = await res.json() as Record<string, unknown>
    expect(body['object']).toBe('chat.completion')
    expect(typeof body['id']).toBe('string')
    expect(typeof body['created']).toBe('number')
    expect(Array.isArray(body['choices'])).toBe(true)
    expect(body['usage']).toBeDefined()
  })

  it('response includes provider field', async () => {
    const res = await post({ messages: [{ role: 'user', content: 'hi' }] })
    const body = await res.json() as { provider: string }
    expect(body.provider).toBe('mock')
  })

  it('choices contain assistant message', async () => {
    const res = await post({ messages: [{ role: 'user', content: 'hi' }] })
    const body = await res.json() as { choices: Array<{ message: { role: string; content: string } }> }
    expect(body.choices[0]?.message.role).toBe('assistant')
    expect(body.choices[0]?.message.content).toBe('Hello!')
  })

  it('usage has correct token counts', async () => {
    const res = await post({ messages: [{ role: 'user', content: 'hi' }] })
    const body = await res.json() as { usage: Record<string, number> }
    expect(body.usage['promptTokens']).toBe(5)
    expect(body.usage['completionTokens']).toBe(3)
    expect(body.usage['totalTokens']).toBe(8)
  })

  it('forwards model field from request to adapter', async () => {
    let capturedModel: string | undefined
    const registry = new AdapterRegistry()
    registry.register(makeMockAdapter({
      async chatCompletion(req) {
        capturedModel = req.model
        return { id: 'x', choices: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
      },
    }))
    const { server: s2, baseUrl: u2 } = await startServer(registry)
    try {
      await fetch(`${u2}/api/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
        body: JSON.stringify({ model: 'deepseek-v4-flash-free', messages: [{ role: 'user', content: 'hi' }] }),
      })
      expect(capturedModel).toBe('deepseek-v4-flash-free')
    } finally {
      await stopServer(s2)
    }
  })

  it('forwards temperature to adapter', async () => {
    let capturedTemp: number | undefined
    const registry = new AdapterRegistry()
    registry.register(makeMockAdapter({
      async chatCompletion(req) {
        capturedTemp = req.temperature
        return { id: 'x', choices: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
      },
    }))
    const { server: s2, baseUrl: u2 } = await startServer(registry)
    try {
      await fetch(`${u2}/api/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
        body: JSON.stringify({ temperature: 0.3, messages: [{ role: 'user', content: 'hi' }] }),
      })
      expect(capturedTemp).toBe(0.3)
    } finally {
      await stopServer(s2)
    }
  })

  it('returns 500 when adapter throws during completion', async () => {
    const registry = new AdapterRegistry()
    registry.register(makeMockAdapter({
      async chatCompletion() { throw new Error('adapter exploded') },
    }))
    const { server: s2, baseUrl: u2 } = await startServer(registry)
    try {
      const res = await fetch(`${u2}/api/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
      })
      expect(res.status).toBe(500)
      const body = await res.json() as { error: string }
      expect(body.error).toMatch(/adapter exploded/)
    } finally {
      await stopServer(s2)
    }
  })
})

// ── 503 when no adapter ───────────────────────────────────────────────────────

describe('POST /api/chat/completions — no adapter', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    // Empty registry — no adapters available
    ;({ server, baseUrl } = await startServer(new AdapterRegistry()))
  })
  afterAll(() => stopServer(server))

  it('returns 503 when no adapter is available', async () => {
    const res = await fetch(`${baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(res.status).toBe(503)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/No healthy adapter/)
  })
})

// ── streaming ─────────────────────────────────────────────────────────────────

describe('POST /api/chat/completions — streaming', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const registry = new AdapterRegistry()
    registry.register(makeMockAdapter())
    ;({ server, baseUrl } = await startServer(registry))
  })
  afterAll(() => stopServer(server))

  async function stream(body: Record<string, unknown>) {
    return fetch(`${baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(body),
    })
  }

  it('returns text/event-stream Content-Type for stream: true', async () => {
    const res = await stream({ stream: true, messages: [{ role: 'user', content: 'hi' }] })
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/)
  })

  it('SSE body ends with [DONE]', async () => {
    const res = await stream({ stream: true, messages: [{ role: 'user', content: 'hi' }] })
    const text = await res.text()
    const events = parseSSE(text)
    expect(events.at(-1)?.data).toBe('[DONE]')
  })

  it('SSE body contains chunk data before [DONE]', async () => {
    const res = await stream({ stream: true, messages: [{ role: 'user', content: 'hi' }] })
    const text = await res.text()
    const events = parseSSE(text)
    // Last event is [DONE], rest should be parseable JSON chunks
    const dataEvents = events.slice(0, -1)
    expect(dataEvents.length).toBeGreaterThan(0)
    for (const ev of dataEvents) {
      expect(() => JSON.parse(ev.data)).not.toThrow()
    }
  })

  it('SSE chunks contain assistant content', async () => {
    const res = await stream({ stream: true, messages: [{ role: 'user', content: 'hi' }] })
    const text = await res.text()
    const events = parseSSE(text)
    const dataEvents = events.slice(0, -1)
    const contents = dataEvents
      .map(e => JSON.parse(e.data) as { choices: Array<{ delta: { content?: string } }> })
      .flatMap(c => c.choices.map(ch => ch.delta.content ?? ''))
      .join('')
    expect(contents).toBe('Hi!')
  })
})
