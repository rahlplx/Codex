import { Router } from 'express'
import type { AdapterRegistry } from '../../adapters/registry'

export function createModelsRouter(registry: AdapterRegistry): Router {
  const router = Router()

  router.get('/api/models', async (_req, res) => {
    const adapters = registry.list()
    const modelSets = await Promise.all(
      adapters.map(async adapter => {
        const models = await adapter.supportedModels().catch(() => [])
        return (Array.isArray(models) ? models : []).map(m => ({ ...m, provider: adapter.id }))
      })
    )
    res.json({ models: modelSets.flat(), ts: new Date().toISOString() })
  })

  return router
}
