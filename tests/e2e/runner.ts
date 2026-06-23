// CRITICAL: must be before any backend import — jwt.ts throws at module eval if missing
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'sim-secret-codex-e2e-minimum-32ch!!'

import { startSimServer, stopSimServer } from './helpers/server.js'
import { SimClient } from './helpers/client.js'
import { MockAdapter } from './fixtures/mock-adapter.js'
import { runAuthScenarios } from './scenarios/auth.js'
import { runThreadScenarios } from './scenarios/threads.js'
import { runChatScenarios } from './scenarios/chat.js'
import { runRoutingScenarios } from './scenarios/routing.js'
import { runProviderScenarios } from './scenarios/providers.js'
import { runTelemetryScenarios } from './scenarios/telemetry.js'
import { runAdminScenarios } from './scenarios/admin.js'
import { runErrorScenarios } from './scenarios/errors.js'
import { generateReport } from './report.js'
import type { ScenarioGroupResult } from './report.js'

const MAX_ITERATIONS = parseInt(process.env['SIM_MAX_ITERATIONS'] ?? '3', 10)

async function runOnce(): Promise<{ allPassed: boolean; results: ScenarioGroupResult[] }> {
  const mock = new MockAdapter()
  const sim = await startSimServer(mock)
  const http = new SimClient(sim.baseUrl)
  const groupResults: ScenarioGroupResult[] = []

  async function runGroup(name: string, fn: () => Promise<void>): Promise<void> {
    const t0 = Date.now()
    try {
      await fn()
      groupResults.push({ name, status: 'pass', durationMs: Date.now() - t0 })
      console.log(`  ✅ ${name} (${Date.now() - t0}ms)`)
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      groupResults.push({ name, status: 'fail', error, durationMs: Date.now() - t0 })
      console.log(`  ❌ ${name} (${Date.now() - t0}ms)\n     ${error}`)
    }
  }

  try {
    // auth must run first — all other scenarios need the tokens it returns
    let authCtx: Awaited<ReturnType<typeof runAuthScenarios>> | null = null
    await runGroup('auth', async () => {
      authCtx = await runAuthScenarios(http)
    })

    if (authCtx) {
      const { adminToken, adminId, userToken, userId } = authCtx
      await runGroup('providers', () => runProviderScenarios(http))
      await runGroup('chat', () => runChatScenarios(http, mock))
      await runGroup('routing', () => runRoutingScenarios(http, adminToken))
      await runGroup('threads', () => runThreadScenarios(http, adminToken, userToken))
      await runGroup('telemetry', () => runTelemetryScenarios(http, adminToken))
      // admin deletes userId at the end — must run after threads (ownership tests need userId alive)
      await runGroup('admin', () => runAdminScenarios(http, adminToken, adminId, userId))
      // errors runs last — avoids rate limiter interference with auth tests
      await runGroup('errors', () => runErrorScenarios(http, adminToken))
    } else {
      const skipped: string[] = ['providers', 'chat', 'routing', 'threads', 'telemetry', 'admin', 'errors']
      for (const name of skipped) {
        groupResults.push({ name, status: 'fail', error: 'Skipped: auth group failed', durationMs: 0 })
        console.log(`  ⏭  ${name} (skipped)`)
      }
    }
  } finally {
    await stopSimServer(sim)
  }

  return {
    allPassed: groupResults.every(r => r.status === 'pass'),
    results: groupResults,
  }
}

async function main(): Promise<void> {
  console.log('\n═══════════════════════════════════════')
  console.log('  Codex E2E Simulation Framework')
  console.log(`  Max iterations: ${MAX_ITERATIONS}`)
  console.log('═══════════════════════════════════════')

  const allResults: ScenarioGroupResult[] = []
  let finalIteration = 0
  let shipReady = false

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    finalIteration = iteration
    console.log(`\n── Iteration ${iteration} / ${MAX_ITERATIONS} ──`)

    const { allPassed, results } = await runOnce()
    for (const r of results) {
      allResults.push({ ...r, name: `[iter${iteration}] ${r.name}` })
    }

    if (allPassed) {
      console.log(`\n✅ All scenarios passed on iteration ${iteration}.`)
      shipReady = true
      break
    }

    const failed = results.filter(r => r.status === 'fail')
    console.log(`\n${failed.length} group(s) failed.${iteration < MAX_ITERATIONS ? ' Retrying...' : ' Max iterations reached.'}`)
  }

  const passed = allResults.filter(r => r.status === 'pass').length
  const total = allResults.length

  console.log('\n═══════════════════════════════════════')
  console.log(`  Final: ${passed}/${total} passed — ${shipReady ? 'SHIP READY' : 'NOT READY'}`)
  console.log('═══════════════════════════════════════')

  await generateReport({
    results: allResults,
    iteration: finalIteration,
    maxIterations: MAX_ITERATIONS,
    passRate: total > 0 ? passed / total : 0,
    shipReady,
  })

  process.exit(shipReady ? 0 : 1)
}

main().catch(e => {
  console.error('\nSimulation runner crashed:', e)
  process.exit(2)
})
