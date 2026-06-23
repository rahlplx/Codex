import { describe, it, expect, vi, afterEach } from 'vitest'
import { TelegramBotBridge, createTelegramBridge } from '../../../backend/src/integrations/telegram.js'

function makeBridge(overrides?: { allowedUserIds?: number[] }) {
  return new TelegramBotBridge({
    token: 'test-token',
    // Default to allowing user 100 (the user ID used in all fetchUpdates tests).
    // Pass an explicit list to test access control.
    allowedUserIds: overrides?.allowedUserIds ?? [100],
    backendUrl: 'http://localhost:3001',
  })
}

describe('TelegramBotBridge — lifecycle', () => {
  it('starts and stops polling', async () => {
    const bridge = makeBridge()
    expect(bridge.isRunning()).toBe(false)
    await bridge.start()
    expect(bridge.isRunning()).toBe(true)
    bridge.stop()
    expect(bridge.isRunning()).toBe(false)
  })

  it('start is idempotent', async () => {
    const bridge = makeBridge()
    await bridge.start()
    await bridge.start()
    expect(bridge.isRunning()).toBe(true)
    bridge.stop()
  })

  it('reports zero mapped chats initially', () => {
    const bridge = makeBridge()
    expect(bridge.getMappedChats()).toBe(0)
  })
})

describe('createTelegramBridge', () => {
  afterEach(() => {
    delete process.env['TELEGRAM_BOT_TOKEN']
    delete process.env['TELEGRAM_ALLOWED_USER_IDS']
    delete process.env['TELEGRAM_BACKEND_URL']
  })

  it('returns null when no token configured', () => {
    expect(createTelegramBridge()).toBeNull()
  })

  it('returns bridge when token is set', () => {
    process.env['TELEGRAM_BOT_TOKEN'] = 'test-token'
    const bridge = createTelegramBridge()
    expect(bridge).not.toBeNull()
  })

  it('parses allowed user IDs', () => {
    process.env['TELEGRAM_BOT_TOKEN'] = 'test-token'
    process.env['TELEGRAM_ALLOWED_USER_IDS'] = '123,456,789'
    const bridge = createTelegramBridge()
    expect(bridge).not.toBeNull()
  })
})

describe('TelegramBotBridge — fetchUpdates', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches updates from Telegram API', async () => {
    const updates = { ok: true, result: [] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updates),
    }))

    const bridge = makeBridge()
    const result = await bridge.fetchUpdates()
    expect(result).toEqual([])
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toContain('bottest-token/getUpdates')
  })

  it('throws on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const bridge = makeBridge()
    await expect(bridge.fetchUpdates()).rejects.toThrow('401')
  })

  it('handles /help command', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/help', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const sendCall = fetchMock.mock.calls[1]
    expect(sendCall[0]).toContain('sendMessage')
    const body = JSON.parse(sendCall[1].body)
    expect(body.chat_id).toBe(200)
    expect(body.text).toContain('Codex AI Bot')
  })

  it('rejects unauthorized users', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/help', from: { id: 999 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge({ allowedUserIds: [100, 200] })
    await bridge.fetchUpdates()
    const sendCall = fetchMock.mock.calls[1]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toContain('not authorized')
  })

  it('handles /status command with no thread', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/status', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    const sendCall = fetchMock.mock.calls[1]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toContain('No thread connected')
  })

  it('handles /newthread command', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/newthread', from: { id: 100, first_name: 'Test' }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'thread-1', title: 'Telegram Test' }) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    expect(bridge.getMappedChats()).toBe(1)
  })

  it('handles /chat without arguments', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/chat', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    const sendCall = fetchMock.mock.calls[1]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toContain('Usage: /chat')
  })

  it('handles /chat with message — creates thread and gets completion', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/chat hello world', from: { id: 100, first_name: 'Test' }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      // createThread POST /api/threads
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'thread-1', title: 'Telegram Test' }) })
      // POST /api/threads/thread-1/messages (user message)
      .mockResolvedValueOnce({ ok: true })
      // GET /api/threads/thread-1/messages (history)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ role: 'user', content: 'hello world' }]) })
      // POST /api/chat/completions
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'Hi there!' } }] }) })
      // POST /api/threads/thread-1/messages (assistant reply)
      .mockResolvedValueOnce({ ok: true })
      // sendMessage to Telegram
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    expect(bridge.getMappedChats()).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(7)
    const sendCall = fetchMock.mock.calls[6]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toBe('Hi there!')
  })

  it('handles /chat with existing thread — skips thread creation', async () => {
    // First create a thread via /newthread
    const newThreadUpdates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/newthread', from: { id: 100, first_name: 'Test' }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(newThreadUpdates) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'thread-1', title: 'Telegram Test' }) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    expect(bridge.getMappedChats()).toBe(1)

    // Now send /chat — should reuse existing thread
    const chatUpdates = {
      ok: true,
      result: [{
        update_id: 2,
        message: { message_id: 2, text: '/chat test msg', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    fetchMock.mockReset()
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chatUpdates) })
      // POST user message (no thread creation)
      .mockResolvedValueOnce({ ok: true })
      // GET history
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ role: 'user', content: 'test msg' }]) })
      // POST completion
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'reply' } }] }) })
      // POST assistant message
      .mockResolvedValueOnce({ ok: true })
      // sendMessage
      .mockResolvedValueOnce({ ok: true })

    await bridge.fetchUpdates()
    // No thread creation call — 6 calls not 7
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('handles /chat when completion fails', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/chat test', from: { id: 100, first_name: 'Test' }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      // createThread
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'thread-1', title: 'T' }) })
      // POST user message
      .mockResolvedValueOnce({ ok: true })
      // GET history
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      // POST completion — fails
      .mockResolvedValueOnce({ ok: false, status: 503 })
      // sendMessage error
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    const sendCall = fetchMock.mock.calls[5]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toBe('AI request failed.')
  })

  it('handles /chat when thread creation fails', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/chat test', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      // createThread fails
      .mockResolvedValueOnce({ ok: false, status: 500 })
      // sendMessage "Failed to create thread"
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    const sendCall = fetchMock.mock.calls[2]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toBe('Failed to create thread.')
  })

  it('handles /newthread when creation fails', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/newthread', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    expect(bridge.getMappedChats()).toBe(0)
    const sendCall = fetchMock.mock.calls[2]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toBe('Failed to create thread.')
  })

  it('handles unknown command', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/unknown', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    const sendCall = fetchMock.mock.calls[1]
    const body = JSON.parse(sendCall[1].body)
    expect(body.text).toContain('Unknown command')
  })

  it('skips messages without text', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) }))

    const bridge = makeBridge()
    const result = await bridge.fetchUpdates()
    expect(result).toHaveLength(1)
    // Only 1 fetch call (getUpdates), no sendMessage
    expect((fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })

  it('sendMessage does not include parse_mode', async () => {
    const updates = {
      ok: true,
      result: [{
        update_id: 1,
        message: { message_id: 1, text: '/help', from: { id: 100 }, chat: { id: 200 } },
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updates) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    await bridge.fetchUpdates()
    const sendCall = fetchMock.mock.calls[1]
    const body = JSON.parse(sendCall[1].body)
    expect(body.parse_mode).toBeUndefined()
  })
})

describe('TelegramBotBridge — thread creation race condition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function makeChatMock() {
    let threadCreateCount = 0
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: { method?: string; body?: string }) => {
      if (typeof url === 'string' && url.includes('/api/threads') && opts?.method === 'POST' && !url.includes('/messages')) {
        threadCreateCount++
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: `thread-${threadCreateCount}`, title: 'T' }) })
      }
      if (typeof url === 'string' && url.includes('/messages') && opts?.method === 'POST') {
        return Promise.resolve({ ok: true })
      }
      if (typeof url === 'string' && url.includes('/messages') && !opts?.method) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ role: 'user', content: 'test' }]) })
      }
      if (typeof url === 'string' && url.includes('/api/chat/completions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'reply' } }] }) })
      }
      if (typeof url === 'string' && url.includes('sendMessage')) {
        return Promise.resolve({ ok: true })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    return { fetchMock, getThreadCreateCount: () => threadCreateCount }
  }

  it('two /chat messages for same chatId in one poll batch create only one thread', async () => {
    const { fetchMock, getThreadCreateCount } = makeChatMock()
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    const update1 = { update_id: 1, message: { message_id: 1, text: '/chat msg1', from: { id: 100, first_name: 'Test' }, chat: { id: 300 } } }
    const update2 = { update_id: 2, message: { message_id: 2, text: '/chat msg2', from: { id: 100, first_name: 'Test' }, chat: { id: 300 } } }

    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true, result: [update1, update2] }) })
    await bridge.fetchUpdates()

    expect(getThreadCreateCount()).toBe(1)
    expect(bridge.getMappedChats()).toBe(1)
  })

  it('two /chat messages for different chatIds each create their own thread', async () => {
    const { fetchMock, getThreadCreateCount } = makeChatMock()
    vi.stubGlobal('fetch', fetchMock)

    const bridge = makeBridge()
    const update1 = { update_id: 1, message: { message_id: 1, text: '/chat msg1', from: { id: 100, first_name: 'Alice' }, chat: { id: 400 } } }
    const update2 = { update_id: 2, message: { message_id: 2, text: '/chat msg2', from: { id: 100, first_name: 'Alice' }, chat: { id: 500 } } }

    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true, result: [update1, update2] }) })
    await bridge.fetchUpdates()

    expect(getThreadCreateCount()).toBe(2)
    expect(bridge.getMappedChats()).toBe(2)
  })
})
