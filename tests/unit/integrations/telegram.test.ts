import { describe, it, expect, vi, afterEach } from 'vitest'
import { TelegramBotBridge, createTelegramBridge } from '../../../backend/src/integrations/telegram.js'

function makeBridge(overrides?: { allowedUserIds?: number[] }) {
  return new TelegramBotBridge({
    token: 'test-token',
    allowedUserIds: overrides?.allowedUserIds ?? [],
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
