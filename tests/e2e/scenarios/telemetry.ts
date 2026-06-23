import type { SimClient } from '../helpers/client.js'
import { assertStatus, assertArray } from '../helpers/assert.js'

export async function runTelemetryScenarios(http: SimClient, adminToken: string): Promise<void> {
  // Chat scenarios run before telemetry and write to usage_log, so we assert non-zero data.

  // 1. Rankings — shape check
  const rank = await http.get('/api/telemetry/rankings', adminToken)
  assertStatus(rank.status, 200, 'telemetry.rankings')
  assertArray(rank.body, 'telemetry.rankings')

  // 2. Usage — default params
  const usage = await http.get('/api/telemetry/usage', adminToken)
  assertStatus(usage.status, 200, 'telemetry.usage_default')
  assertArray(usage.body, 'telemetry.usage_default')

  // 3. Usage with days=7
  const usage7 = await http.get('/api/telemetry/usage?days=7', adminToken)
  assertStatus(usage7.status, 200, 'telemetry.usage_7days')
  assertArray(usage7.body, 'telemetry.usage_7days')

  // 4. Usage with days=365 (max)
  const usage365 = await http.get('/api/telemetry/usage?days=365', adminToken)
  assertStatus(usage365.status, 200, 'telemetry.usage_365days')

  // 5. Usage with invalid days → 400
  const usageBad = await http.get('/api/telemetry/usage?days=-1', adminToken)
  assertStatus(usageBad.status, 400, 'telemetry.usage_invalid_days_400')

  // 6. Reliability — shape check
  const rel = await http.get('/api/telemetry/reliability', adminToken)
  assertStatus(rel.status, 200, 'telemetry.reliability')
  assertArray(rel.body, 'telemetry.reliability')

  // 7. Speed — shape check
  const spd = await http.get('/api/telemetry/speed', adminToken)
  assertStatus(spd.status, 200, 'telemetry.speed')
  assertArray(spd.body, 'telemetry.speed')

  // 8. Summary — field presence and non-zero requests
  const sum = await http.get('/api/telemetry/summary', adminToken)
  assertStatus(sum.status, 200, 'telemetry.summary')
  const sumBody = sum.body as Record<string, unknown>
  for (const field of ['total_requests', 'total_tokens_in', 'total_tokens_out', 'avg_latency']) {
    if (sumBody[field] === undefined)
      throw new Error(`telemetry.summary: field "${field}" missing`)
  }
  const totalRequests = sumBody['total_requests'] as number
  if (totalRequests < 1)
    throw new Error(`telemetry.summary: expected total_requests >= 1 (usage_log should be populated by chat scenarios), got ${totalRequests}`)

  // 9. Unauthenticated access → 401
  const unauth = await http.get('/api/telemetry/rankings')
  assertStatus(unauth.status, 401, 'telemetry.rankings_unauth_401')
}
