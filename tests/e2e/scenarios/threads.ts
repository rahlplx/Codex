import type { SimClient } from '../helpers/client.js'
import { assertStatus, assertArray } from '../helpers/assert.js'

export async function runThreadScenarios(
  http: SimClient,
  adminToken: string,
  userToken: string,
): Promise<void> {
  // 1. Create thread
  const create = await http.post('/api/threads', { title: 'Sim Thread Alpha' }, adminToken)
  assertStatus(create.status, 201, 'threads.create')
  const threadId = (create.body as Record<string, unknown>)['id'] as string
  if (!threadId) throw new Error('threads.create: missing id')
  if ((create.body as Record<string, unknown>)['title'] !== 'Sim Thread Alpha')
    throw new Error('threads.create: title mismatch')

  // 2. List threads
  const list = await http.get('/api/threads', adminToken)
  assertStatus(list.status, 200, 'threads.list')
  assertArray(list.body, 'threads.list')
  if ((list.body as unknown[]).length < 1) throw new Error('threads.list: expected at least 1 thread')

  // 3. Get thread by ID
  const get = await http.get(`/api/threads/${threadId}`, adminToken)
  assertStatus(get.status, 200, 'threads.get')
  if ((get.body as Record<string, unknown>)['title'] !== 'Sim Thread Alpha')
    throw new Error('threads.get: title mismatch')

  // 4. Update title
  const patch = await http.patch(`/api/threads/${threadId}`, { title: 'Sim Thread Updated' }, adminToken)
  assertStatus(patch.status, 200, 'threads.update_title')
  if ((patch.body as Record<string, unknown>)['title'] !== 'Sim Thread Updated')
    throw new Error('threads.update_title: title mismatch')

  // 5. Archive
  const archive = await http.patch(`/api/threads/${threadId}`, { archived: true }, adminToken)
  assertStatus(archive.status, 200, 'threads.archive')
  if ((archive.body as Record<string, unknown>)['archived'] !== true)
    throw new Error('threads.archive: archived not true')

  // 6. Add messages
  const msg1 = await http.post(
    `/api/threads/${threadId}/messages`,
    { role: 'user', content: 'Hello sim' },
    adminToken,
  )
  assertStatus(msg1.status, 201, 'threads.add_user_message')
  if ((msg1.body as Record<string, unknown>)['content'] !== 'Hello sim')
    throw new Error('threads.add_user_message: content mismatch')

  const msg2 = await http.post(
    `/api/threads/${threadId}/messages`,
    { role: 'assistant', content: 'Hi from mock' },
    adminToken,
  )
  assertStatus(msg2.status, 201, 'threads.add_assistant_message')

  // 7. List messages
  const msgs = await http.get(`/api/threads/${threadId}/messages`, adminToken)
  assertStatus(msgs.status, 200, 'threads.list_messages')
  assertArray(msgs.body, 'threads.list_messages')
  if ((msgs.body as unknown[]).length !== 2)
    throw new Error(`threads.list_messages: expected 2, got ${(msgs.body as unknown[]).length}`)

  // 8. Ownership: user B cannot read admin's thread → 403
  const steal = await http.get(`/api/threads/${threadId}`, userToken)
  assertStatus(steal.status, 403, 'threads.ownership_403')

  // 9. User B cannot post to admin's thread → 403
  const stealMsg = await http.post(
    `/api/threads/${threadId}/messages`,
    { role: 'user', content: 'injected' },
    userToken,
  )
  assertStatus(stealMsg.status, 403, 'threads.ownership_message_403')

  // 10. Delete thread
  const del = await http.delete(`/api/threads/${threadId}`, adminToken)
  assertStatus(del.status, 204, 'threads.delete')

  // 11. Deleted thread → 404
  const getDeleted = await http.get(`/api/threads/${threadId}`, adminToken)
  assertStatus(getDeleted.status, 404, 'threads.get_deleted_404')
}
