import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../../../backend/src/server/httpServer'
import type { Server } from 'node:http'

describe('GET /health (integration)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp()
    await new Promise<void>(resolve => {
      server = app.listen(0, () => resolve())
    })
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 3001
    baseUrl = `http://localhost:${port}`
  })

  afterAll(() => {
    server?.close()
  })

  it('returns 200 with status ok', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; ts: string }
    expect(body.status).toBe('ok')
    expect(body.ts).toBeTruthy()
  })
})
