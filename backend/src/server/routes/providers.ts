import { Router } from 'express'
import type { AdapterRegistry } from '../../adapters/registry'
import type { ProviderListResponse } from '../../types/provider'

export function createProvidersRouter(registry: AdapterRegistry): Router {
  const router = Router()

  router.get('/api/providers', async (_req, res) => {
    const adapters = registry.list()
    const providers = await Promise.all(
      adapters.map(async adapter => {
        const [health, quota, models] = await Promise.all([
          adapter.healthCheck().catch(err => ({ healthy: false, latencyMs: 0, score: 0, error: String(err) })),
          adapter.getQuota().catch(() => ({ unlimited: false, remaining: null, resetAt: null })),
          adapter.supportedModels().catch(() => []),
        ])
        return {
          id: adapter.id,
          name: adapter.name,
          tier: adapter.tier,
          health,
          quota,
          models: Array.isArray(models) ? models : [],
          enabled: true,
        }
      })
    )
    const body: ProviderListResponse = { providers, ts: new Date().toISOString() }
    res.json(body)
  })

  return router
}
