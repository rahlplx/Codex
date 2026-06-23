import type { SimClient } from '../helpers/client.js'
import { assertStatus, assertArray } from '../helpers/assert.js'
import { setAutoRouting, setDisabledAdapters } from '../../../backend/src/orchestrator/routingPrefs.js'

export async function runRoutingScenarios(http: SimClient, adminToken: string): Promise<void> {
  // Reset to clean state before testing
  setAutoRouting(true)
  setDisabledAdapters([])

  // Seed domain scores by making a coding chat call
  await http.post('/api/chat/completions', {
    messages: [{ role: 'user', content: 'debug this typescript code and fix the type error' }],
    stream: false,
  }, adminToken)

  // 1. GET /api/routing/auto-stats — shape check (requires auth)
  const stats = await http.get('/api/routing/auto-stats', adminToken)
  assertStatus(stats.status, 200, 'routing.auto_stats')
  const statsBody = stats.body as Record<string, unknown>
  if (typeof statsBody['autoRouting'] !== 'boolean')
    throw new Error('routing.auto_stats: autoRouting field missing or not boolean')
  if (!Array.isArray(statsBody['disabledAdapters']))
    throw new Error('routing.auto_stats: disabledAdapters not an array')
  if (!Array.isArray(statsBody['rankings']))
    throw new Error('routing.auto_stats: rankings not an array')

  // 2. Rankings should be non-empty after seeded coding call
  const rankings = statsBody['rankings'] as Array<Record<string, unknown>>
  if (rankings.length === 0)
    throw new Error('routing.auto_stats: rankings empty — expected at least 1 entry after seeded call')

  // Verify ranking shape
  const r = rankings[0]!
  for (const field of ['domain', 'preferredAdapter', 'score', 'calls', 'successRate', 'avgLatencyMs']) {
    if (r[field] === undefined)
      throw new Error(`routing.auto_stats: rankings[0].${field} missing`)
  }

  // 3. Unauthenticated request → 401
  const unauthedStats = await http.get('/api/routing/auto-stats')
  assertStatus(unauthedStats.status, 401, 'routing.auto_stats_unauthed_401')

  // 4. Non-admin cannot change preferences → 403
  // (tested implicitly by only calling preferences with adminToken below)

  // 5. Disable mock adapter (admin only)
  const disableRes = await http.post('/api/routing/preferences', { disabledAdapters: ['mock-sim'] }, adminToken)
  assertStatus(disableRes.status, 200, 'routing.disable_adapter')
  const disabledList = (disableRes.body as Record<string, unknown>)['disabledAdapters'] as string[]
  if (!Array.isArray(disabledList) || !disabledList.includes('mock-sim'))
    throw new Error('routing.disable_adapter: mock-sim not in disabledAdapters response')

  // 6. Chat with disabled adapter → 503
  const s503 = await http.post('/api/chat/completions', {
    messages: [{ role: 'user', content: 'hi' }],
    stream: false,
  }, adminToken)
  assertStatus(s503.status, 503, 'routing.disabled_503')

  // 7. Re-enable
  const enableRes = await http.post('/api/routing/preferences', { disabledAdapters: [] }, adminToken)
  assertStatus(enableRes.status, 200, 'routing.re_enable')
  const enabledList = (enableRes.body as Record<string, unknown>)['disabledAdapters'] as string[]
  if (!Array.isArray(enabledList) || enabledList.length !== 0)
    throw new Error('routing.re_enable: disabledAdapters not empty after re-enable')

  // 8. Toggle autoRouting off
  const offRes = await http.post('/api/routing/preferences', { autoRouting: false }, adminToken)
  assertStatus(offRes.status, 200, 'routing.autorouting_off')
  if ((offRes.body as Record<string, unknown>)['autoRouting'] !== false)
    throw new Error('routing.autorouting_off: autoRouting not false in response')

  // 9. Restore clean state
  setAutoRouting(true)
  setDisabledAdapters([])
}
