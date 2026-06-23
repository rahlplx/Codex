import type { SimClient } from '../helpers/client.js'
import { assertStatus } from '../helpers/assert.js'

export async function runErrorScenarios(http: SimClient, adminToken: string): Promise<void> {
  // 1. Malformed JSON body → 400 (Express 5 json() middleware)
  const start = Date.now()
  const rawRes = await fetch(`${http.baseUrl}/api/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ this is not json }',
  })
  const rawText = await rawRes.text()
  http.calls.push({
    ts: new Date().toISOString(),
    method: 'POST',
    url: '/api/chat/completions',
    reqBody: '{ this is not json }',
    status: rawRes.status,
    resBody: rawText,
    latencyMs: Date.now() - start,
    headers: Object.fromEntries(rawRes.headers.entries()),
  })
  assertStatus(rawRes.status, 400, 'errors.malformed_json_400')

  // 2. Invalid JWT → 401
  const fakeStart = Date.now()
  const fakeRes = await fetch(`${http.baseUrl}/api/threads`, {
    method: 'GET',
    headers: { Authorization: 'Bearer totally.invalid.jwt' },
  })
  const fakeText = await fakeRes.text()
  http.calls.push({
    ts: new Date().toISOString(),
    method: 'GET',
    url: '/api/threads',
    reqBody: undefined,
    status: fakeRes.status,
    resBody: fakeText,
    latencyMs: Date.now() - fakeStart,
    headers: Object.fromEntries(fakeRes.headers.entries()),
  })
  assertStatus(fakeRes.status, 401, 'errors.invalid_jwt_401')

  // 3. Thread not found → 404
  const t404 = await http.get('/api/threads/does-not-exist-9999', adminToken)
  assertStatus(t404.status, 404, 'errors.thread_not_found_404')

  // 4. Thread messages on nonexistent thread → 404
  const m404 = await http.get('/api/threads/does-not-exist-9999/messages', adminToken)
  assertStatus(m404.status, 404, 'errors.thread_messages_not_found_404')

  // 5. Health endpoint (both paths)
  const h1 = await http.get('/health')
  assertStatus(h1.status, 200, 'errors.health_root')
  const h2 = await http.get('/api/health')
  assertStatus(h2.status, 200, 'errors.health_api')
}
