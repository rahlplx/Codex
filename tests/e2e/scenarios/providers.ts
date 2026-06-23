import type { SimClient } from '../helpers/client.js'
import { assertStatus, assertArray, assertString } from '../helpers/assert.js'

export async function runProviderScenarios(http: SimClient): Promise<void> {
  // 1. GET /api/providers — shape check
  const pRes = await http.get('/api/providers')
  assertStatus(pRes.status, 200, 'providers.list')
  const pBody = pRes.body as Record<string, unknown>
  assertArray(pBody['providers'], 'providers.list.providers')
  assertString(pBody['ts'], 'providers.list.ts')
  const providers = pBody['providers'] as Array<Record<string, unknown>>
  if (providers.length === 0)
    throw new Error('providers.list: expected at least 1 provider (mock-sim)')
  const p = providers[0]!
  for (const field of ['id', 'name', 'tier', 'health', 'quota', 'models', 'enabled']) {
    if (p[field] === undefined)
      throw new Error(`providers.list: providers[0].${field} missing`)
  }
  if (p['enabled'] !== true)
    throw new Error(`providers.list: providers[0].enabled is ${String(p['enabled'])}, expected true`)
  if (p['id'] !== 'mock-sim')
    throw new Error(`providers.list: expected mock-sim provider, got ${String(p['id'])}`)

  // 2. GET /api/models — shape check
  const mRes = await http.get('/api/models')
  assertStatus(mRes.status, 200, 'models.list')
  const mBody = mRes.body as Record<string, unknown>
  assertArray(mBody['models'], 'models.list.models')
  assertString(mBody['ts'], 'models.list.ts')
  const models = mBody['models'] as Array<Record<string, unknown>>
  if (models.length === 0)
    throw new Error('models.list: expected at least 1 model from mock-sim')
  if (models[0]!['provider'] === undefined)
    throw new Error('models.list: models[0].provider missing')
  if (models[0]!['provider'] !== 'mock-sim')
    throw new Error(`models.list: models[0].provider="${String(models[0]!['provider'])}", expected "mock-sim"`)
}
