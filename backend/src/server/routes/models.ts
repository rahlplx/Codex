import { Router } from 'express'
import type { AdapterRegistry } from '../../adapters/registry.js'
import type { ModelDiscoveryScanner } from '../../discovery/scanner.js'
import { authGuard } from '../../auth/middleware.js'

export function createModelsRouter(registry: AdapterRegistry, scanner?: ModelDiscoveryScanner): Router {
  const router = Router()

  router.get('/api/models', authGuard, async (_req, res) => {
    const catalog = scanner?.getCatalog() ?? []
    if (catalog.length > 0) {
      res.json({ models: catalog, ts: new Date().toISOString() })
      return
    }

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
