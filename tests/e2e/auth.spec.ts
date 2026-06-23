import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  const email = `e2e-${Date.now()}@test.com`
  const password = 'testpassword123'
  let token: string

  test('register a new user', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email, password, displayName: 'E2E User' },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.token).toBeDefined()
    expect(body.user.email).toBe(email)
    token = body.token
  })

  test('login with registered user', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email, password },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.token).toBeDefined()
    expect(body.user.email).toBe(email)
  })

  test('login fails with wrong password', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email, password: 'wrongpass' },
    })
    expect(res.status()).toBe(401)
  })

  test('register fails with duplicate email', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email, password: 'other', displayName: 'Dup' },
    })
    expect(res.status()).toBe(409)
  })
})
