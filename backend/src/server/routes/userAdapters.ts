import { Router } from 'express'
import type { TenantAdapterRepository } from '../../storage/tenantAdapters.js'
import { authGuard } from '../../auth/middleware.js'

function maskRow(r: { id: string; name: string; baseUrl: string; label: string | undefined; apiKey: string | undefined; isActive: boolean; createdAt: string }) {
  return {
    id: r.id,
    name: r.name,
    baseUrl: r.baseUrl,
    label: r.label,
    hasKey: !!r.apiKey,
    isActive: r.isActive,
    createdAt: r.createdAt,
  }
}

export function createUserAdaptersRouter(repo: TenantAdapterRepository): Router {
  const router = Router()
  router.use(authGuard)

  router.post('/api/user/adapters', (req, res) => {
    const { name, baseUrl, apiKey, label } = req.body as Record<string, unknown>
    if (typeof name !== 'string' || !name || typeof baseUrl !== 'string' || !baseUrl) {
      res.status(400).json({ error: 'name and baseUrl are required' })
      return
    }
    try {
      const parsed = new URL(baseUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        res.status(400).json({ error: 'baseUrl must use http or https' })
        return
      }
    } catch {
      res.status(400).json({ error: 'baseUrl must be a valid URL' })
      return
    }
    try {
      const insertArgs: { tenantId: string; name: string; baseUrl: string; apiKey?: string; label?: string } = {
        tenantId: req.tenant!.sub,
        name,
        baseUrl,
      }
      if (typeof apiKey === 'string') insertArgs.apiKey = apiKey
      if (typeof label === 'string') insertArgs.label = label
      const row = repo.insert(insertArgs)
      res.status(201).json(maskRow(row))
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/api/user/adapters', (req, res) => {
    res.json(repo.list(req.tenant!.sub).map(maskRow))
  })

  router.patch('/api/user/adapters/:id', (req, res) => {
    const body = req.body as { label?: unknown; isActive?: unknown }
    const updates: { label?: string; isActive?: boolean } = {}
    if (typeof body.label === 'string') updates.label = body.label
    if (typeof body.isActive === 'boolean') updates.isActive = body.isActive
    const updated = repo.patch(req.params['id']!, req.tenant!.sub, updates)
    if (!updated) { res.status(404).json({ error: 'Adapter not found' }); return }
    res.json(maskRow(updated))
  })

  router.delete('/api/user/adapters/:id', (req, res) => {
    if (!repo.delete(req.params['id']!, req.tenant!.sub)) {
      res.status(404).json({ error: 'Adapter not found' })
      return
    }
    res.status(204).end()
  })

  return router
}
