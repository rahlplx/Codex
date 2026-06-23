import type { SimClient } from '../helpers/client.js'
import { assertStatus, assertArray, assertIncludes } from '../helpers/assert.js'
import type { MockAdapter } from '../fixtures/mock-adapter.js'
import { setAutoRouting, setDisabledAdapters } from '../../../backend/src/orchestrator/routingPrefs.js'

function parseSSEEvents(text: string): Array<{ data: string }> {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map(block => {
      const dataLine = block.split('\n').find(l => l.startsWith('data:'))
      return { data: dataLine ? dataLine.slice(5).trim() : '' }
    })
    .filter(e => e.data !== '')
}

export async function runChatScenarios(http: SimClient, mock: MockAdapter): Promise<void> {
  // Reset routing prefs to clean state
  setAutoRouting(true)
  setDisabledAdapters([])

  // 1. Non-streaming chat completion
  const chatRes = await http.post('/api/chat/completions', {
    messages: [{ role: 'user', content: 'Say hello' }],
    stream: false,
  })
  assertStatus(chatRes.status, 200, 'chat.nonstream')
  const chatBody = chatRes.body as Record<string, unknown>
  if (chatBody['object'] !== 'chat.completion')
    throw new Error(`chat.nonstream: object="${String(chatBody['object'])}", expected "chat.completion"`)
  assertArray(chatBody['choices'] as unknown, 'chat.nonstream.choices')
  if (chatBody['provider'] !== 'mock-sim')
    throw new Error(`chat.nonstream: provider="${String(chatBody['provider'])}", expected "mock-sim"`)

  // 2. Domain classification — coding keywords should route to domain=coding
  const codingRes = await http.post('/api/chat/completions', {
    messages: [{ role: 'user', content: 'Write a typescript function to sort an array' }],
    stream: false,
  })
  assertStatus(codingRes.status, 200, 'chat.domain_coding')
  const routedDomain = codingRes.headers.get('x-routed-domain')
  if (routedDomain !== 'coding')
    throw new Error(`chat.domain_coding: x-routed-domain="${String(routedDomain)}", expected "coding"`)
  const routedAdapter = codingRes.headers.get('x-routed-adapter')
  if (routedAdapter !== 'mock-sim')
    throw new Error(`chat.domain_coding: x-routed-adapter="${String(routedAdapter)}", expected "mock-sim"`)

  // 3. Streaming via SSE
  const streamRes = await http.post('/api/chat/completions', {
    messages: [{ role: 'user', content: 'Hi stream' }],
    stream: true,
  })
  assertStatus(streamRes.status, 200, 'chat.stream')
  const ct = streamRes.headers.get('content-type') ?? ''
  if (!ct.includes('text/event-stream'))
    throw new Error(`chat.stream: content-type="${ct}", expected text/event-stream`)
  const events = parseSSEEvents(streamRes.text)
  const lastEvent = events.at(-1)
  if (!lastEvent || lastEvent.data !== '[DONE]')
    throw new Error(`chat.stream: expected [DONE] terminator, got "${String(lastEvent?.data)}"`)
  const dataEvents = events.slice(0, -1)
  if (dataEvents.length === 0) throw new Error('chat.stream: no data events before [DONE]')

  // 4. 503 when no adapters healthy
  mock.setHealthy(false)
  const s503 = await http.post('/api/chat/completions', {
    messages: [{ role: 'user', content: 'Hi' }],
    stream: false,
  })
  assertStatus(s503.status, 503, 'chat.no_adapter_503')
  assertIncludes(JSON.stringify(s503.body), 'No healthy adapter', 'chat.no_adapter_503.body')
  mock.setHealthy(true)

  // 5. Validation: empty messages → 400
  const empty = await http.post('/api/chat/completions', { messages: [], stream: false })
  assertStatus(empty.status, 400, 'chat.empty_messages_400')

  // 6. Validation: missing messages → 400
  const missing = await http.post('/api/chat/completions', { model: 'some-model' })
  assertStatus(missing.status, 400, 'chat.missing_messages_400')
}
