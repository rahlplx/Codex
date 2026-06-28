import type { SimClient } from '../helpers/client.js'
import { assertStatus } from '../helpers/assert.js'

export async function runUserAdaptersScenarios(
  http: SimClient,
  userToken: string,
  adminToken: string,
): Promise<void> {
  // 1. Create a personal adapter — 201
  const createRes = await http.post('/api/user/adapters', {
    name: 'My Nine-Router',
    baseUrl: 'http://localhost:9999',
    apiKey: 'sk-test-key',
    label: 'Local router',
  }, userToken)
  assertStatus(createRes.status, 201, 'user-adapters.create_201')
  const created = createRes.body as Record<string, unknown>
  if (typeof created['id'] !== 'string' || !created['id'])
    throw new Error('user-adapters.create: id missing')
  if (created['baseUrl'] !== 'http://localhost:9999')
    throw new Error(`user-adapters.create: baseUrl mismatch, got ${String(created['baseUrl'])}`)
  if (created['hasKey'] !== true)
    throw new Error('user-adapters.create: hasKey should be true')
  if ('apiKey' in created)
    throw new Error('user-adapters.create: apiKey must not be returned')
  const adapterId = created['id'] as string

  // 2. List adapters — appears in list
  const listRes = await http.get('/api/user/adapters', userToken)
  assertStatus(listRes.status, 200, 'user-adapters.list_200')
  const list = listRes.body as Record<string, unknown>[]
  const found = list.find(r => r['id'] === adapterId)
  if (!found)
    throw new Error('user-adapters.list: created adapter not found in list')
  if ('apiKey' in found)
    throw new Error('user-adapters.list: apiKey must not be returned in list')

  // 3. Admin cannot see user's adapters
  const adminList = await http.get('/api/user/adapters', adminToken)
  assertStatus(adminList.status, 200, 'user-adapters.admin_own_list')
  const adminAdapters = adminList.body as Record<string, unknown>[]
  if (adminAdapters.find(r => r['id'] === adapterId))
    throw new Error('user-adapters.admin_own_list: admin should not see other users adapters')

  // 4. PATCH — update label
  const patchRes = await http.patch(`/api/user/adapters/${adapterId}`, {
    label: 'Updated label',
    isActive: true,
  }, userToken)
  assertStatus(patchRes.status, 200, 'user-adapters.patch_200')
  const patched = patchRes.body as Record<string, unknown>
  if (patched['label'] !== 'Updated label')
    throw new Error(`user-adapters.patch: label="${String(patched['label'])}", expected "Updated label"`)

  // 5. PATCH nonexistent → 404
  const patchBad = await http.patch('/api/user/adapters/does-not-exist', { label: 'x' }, userToken)
  assertStatus(patchBad.status, 404, 'user-adapters.patch_404')

  // 6. Unauthenticated → 401
  const unauth = await http.get('/api/user/adapters')
  assertStatus(unauth.status, 401, 'user-adapters.unauth_401')

  // 7. DELETE — 204
  const delRes = await http.delete(`/api/user/adapters/${adapterId}`, userToken)
  assertStatus(delRes.status, 204, 'user-adapters.delete_204')

  // 8. DELETE again → 404
  const delAgain = await http.delete(`/api/user/adapters/${adapterId}`, userToken)
  assertStatus(delAgain.status, 404, 'user-adapters.delete_404')

  // 9. List is empty after delete
  const listAfter = await http.get('/api/user/adapters', userToken)
  assertStatus(listAfter.status, 200, 'user-adapters.list_after_delete')
  const listAfterBody = listAfter.body as Record<string, unknown>[]
  if (listAfterBody.find(r => r['id'] === adapterId))
    throw new Error('user-adapters.list_after_delete: deleted adapter still appears in list')

  // 10. POST missing required fields → 400
  const badCreate = await http.post('/api/user/adapters', { name: 'No URL' }, userToken)
  assertStatus(badCreate.status, 400, 'user-adapters.create_400_missing_baseUrl')
}
