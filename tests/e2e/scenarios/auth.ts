import type { SimClient } from '../helpers/client.js'
import { assertStatus, assertDefined } from '../helpers/assert.js'

export interface AuthCtx {
  adminToken: string
  adminId: string
  userToken: string
  userId: string
}

export async function runAuthScenarios(http: SimClient): Promise<AuthCtx> {
  // 1. Register User A → admin (first user in empty DB)
  const regA = await http.post('/api/auth/register', {
    email: 'admin-sim@example.com',
    password: 'adminpass123',
    displayName: 'Admin Sim',
  })
  assertStatus(regA.status, 201, 'auth.register_admin')
  const regABody = regA.body as Record<string, unknown>
  assertDefined(regABody['token'], 'auth.register_admin.token')
  const adminToken = regABody['token'] as string
  const adminUser = regABody['user'] as Record<string, unknown>
  if (adminUser['role'] !== 'admin')
    throw new Error(`auth.register_admin: expected role=admin, got ${String(adminUser['role'])}`)
  const adminId = adminUser['id'] as string

  // 2. Register User B → user (second user)
  const regB = await http.post('/api/auth/register', {
    email: 'user-sim@example.com',
    password: 'userpass123',
    displayName: 'User Sim',
  })
  assertStatus(regB.status, 201, 'auth.register_user')
  const regBBody = regB.body as Record<string, unknown>
  assertDefined(regBBody['token'], 'auth.register_user.token')
  const userToken = regBBody['token'] as string
  const userUser = regBBody['user'] as Record<string, unknown>
  if (userUser['role'] !== 'user')
    throw new Error(`auth.register_user: expected role=user, got ${String(userUser['role'])}`)
  const userId = userUser['id'] as string

  // 3. Login with correct credentials
  const login = await http.post('/api/auth/login', {
    email: 'admin-sim@example.com',
    password: 'adminpass123',
  })
  assertStatus(login.status, 200, 'auth.login_correct')
  assertDefined((login.body as Record<string, unknown>)['token'], 'auth.login_correct.token')

  // 4. Login with wrong password → 401
  const loginWrong = await http.post('/api/auth/login', {
    email: 'admin-sim@example.com',
    password: 'wrongpass',
  })
  assertStatus(loginWrong.status, 401, 'auth.login_wrong_password')

  // 5. No token → 401 on protected endpoint
  const noToken = await http.get('/api/threads')
  assertStatus(noToken.status, 401, 'auth.no_token_401')

  // 6. Admin endpoint as regular user → 403
  const forbidden = await http.get('/api/admin/tenants', userToken)
  assertStatus(forbidden.status, 403, 'auth.admin_as_user_403')

  // 7. Duplicate email → 409
  const dup = await http.post('/api/auth/register', {
    email: 'admin-sim@example.com',
    password: 'other',
    displayName: 'Dup',
  })
  assertStatus(dup.status, 409, 'auth.duplicate_email_409')

  return { adminToken, adminId, userToken, userId }
}
