import type { SimClient } from '../helpers/client.js'
import { assertStatus, assertArray } from '../helpers/assert.js'

export async function runAdminScenarios(
  http: SimClient,
  adminToken: string,
  adminId: string,
  userId: string,
): Promise<void> {
  // 1. List tenants — admin only
  const list = await http.get('/api/admin/tenants', adminToken)
  assertStatus(list.status, 200, 'admin.list_tenants')
  assertArray(list.body, 'admin.list_tenants')
  const tenants = list.body as Array<Record<string, unknown>>
  if (tenants.length < 2)
    throw new Error(`admin.list_tenants: expected ≥2 tenants, got ${tenants.length}`)

  // 2. Shape check on tenant records
  const first = tenants[0]!
  for (const field of ['id', 'email', 'role', 'total_tokens', 'total_requests']) {
    if (first[field] === undefined)
      throw new Error(`admin.list_tenants: tenants[0].${field} missing`)
  }

  // 3. Promote user to admin
  const promote = await http.put(`/api/admin/tenants/${userId}/role`, { role: 'admin' }, adminToken)
  assertStatus(promote.status, 200, 'admin.promote_user')
  if ((promote.body as Record<string, unknown>)['updated'] !== true)
    throw new Error('admin.promote_user: updated not true')

  // 4. Demote back to user
  const demote = await http.put(`/api/admin/tenants/${userId}/role`, { role: 'user' }, adminToken)
  assertStatus(demote.status, 200, 'admin.demote_user')

  // 5. Cannot demote self → 400
  const selfDemote = await http.put(
    `/api/admin/tenants/${adminId}/role`,
    { role: 'user' },
    adminToken,
  )
  assertStatus(selfDemote.status, 400, 'admin.self_demote_400')

  // 6. Invalid role → 400
  const badRole = await http.put(
    `/api/admin/tenants/${userId}/role`,
    { role: 'superadmin' },
    adminToken,
  )
  assertStatus(badRole.status, 400, 'admin.invalid_role_400')

  // 7. Unknown tenant → 404
  const notFound = await http.put(
    '/api/admin/tenants/nonexistent-99999/role',
    { role: 'user' },
    adminToken,
  )
  assertStatus(notFound.status, 404, 'admin.unknown_tenant_404')

  // 8. Cannot delete self → 400
  const selfDel = await http.delete(`/api/admin/tenants/${adminId}`, adminToken)
  assertStatus(selfDel.status, 400, 'admin.self_delete_400')

  // 9. Delete user B
  const del = await http.delete(`/api/admin/tenants/${userId}`, adminToken)
  assertStatus(del.status, 200, 'admin.delete_user')
  if ((del.body as Record<string, unknown>)['deleted'] !== true)
    throw new Error('admin.delete_user: deleted not true')
}
