import { test, expect } from '@playwright/test'

test.describe('Health API', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})

test.describe('Models API', () => {
  test('GET /api/models returns model list', async ({ request }) => {
    const res = await request.get('/api/models')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.models).toBeDefined()
    expect(Array.isArray(body.models)).toBe(true)
    expect(body.ts).toBeDefined()
  })
})

test.describe('Providers API', () => {
  test('GET /api/providers returns provider list', async ({ request }) => {
    const res = await request.get('/api/providers')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.providers).toBeDefined()
    expect(Array.isArray(body.providers)).toBe(true)
    for (const p of body.providers) {
      expect(p.id).toBeDefined()
      expect(p.name).toBeDefined()
      expect(p.health).toBeDefined()
      expect(p.enabled).toBe(true)
    }
  })
})
