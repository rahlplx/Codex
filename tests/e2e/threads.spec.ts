import { test, expect } from '@playwright/test'

test.describe('Threads CRUD', () => {
  let threadId: string

  test('create a thread', async ({ request }) => {
    const res = await request.post('/api/threads', {
      data: { title: 'E2E Thread', userId: 'e2e-user' },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
    expect(body.title).toBe('E2E Thread')
    threadId = body.id
  })

  test('list threads for user', async ({ request }) => {
    const res = await request.get('/api/threads?userId=e2e-user')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  test('get thread by id', async ({ request }) => {
    const res = await request.get(`/api/threads/${threadId}`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.title).toBe('E2E Thread')
  })

  test('add message to thread', async ({ request }) => {
    const res = await request.post(`/api/threads/${threadId}/messages`, {
      data: { role: 'user', content: 'Hello from E2E' },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.content).toBe('Hello from E2E')
    expect(body.role).toBe('user')
  })

  test('get messages from thread', async ({ request }) => {
    const res = await request.get(`/api/threads/${threadId}/messages`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].content).toBe('Hello from E2E')
  })

  test('update thread title', async ({ request }) => {
    const res = await request.patch(`/api/threads/${threadId}`, {
      data: { title: 'Updated E2E Thread' },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.title).toBe('Updated E2E Thread')
  })

  test('delete thread', async ({ request }) => {
    const res = await request.delete(`/api/threads/${threadId}`)
    expect(res.status()).toBe(204)
  })

  test('deleted thread returns 404', async ({ request }) => {
    const res = await request.get(`/api/threads/${threadId}`)
    expect(res.status()).toBe(404)
  })
})
