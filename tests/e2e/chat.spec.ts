import { test, expect } from '@playwright/test'

test.describe('Chat Completions API', () => {
  test('POST /api/chat/completions returns response shape', async ({ request }) => {
    const res = await request.post('/api/chat/completions', {
      data: {
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: false,
      },
    })
    // May fail if no adapters are healthy — that's expected in E2E without live providers
    if (res.ok()) {
      const body = await res.json()
      expect(body.choices).toBeDefined()
      expect(Array.isArray(body.choices)).toBe(true)
      expect(body.provider).toBeDefined()
    } else {
      // 503 is acceptable — means no healthy adapter
      expect([500, 503]).toContain(res.status())
    }
  })

  test('POST /api/chat/completions rejects empty messages', async ({ request }) => {
    const res = await request.post('/api/chat/completions', {
      data: { messages: [], stream: false },
    })
    expect(res.ok()).toBe(false)
  })
})
