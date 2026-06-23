import { Router } from 'express'
import type { DomainScoreRepository } from '../../storage/domainScores.js'
import { getRoutingPrefs, setAutoRouting, setDisabledAdapters } from '../../orchestrator/routingPrefs.js'

export function createRoutingRouter(domainScores: DomainScoreRepository): Router {
  const router = Router()

  router.get('/api/routing/auto-stats', (_req, res) => {
    const prefs = getRoutingPrefs()
    const rankings = domainScores.getRankings()
    res.json({
      autoRouting: prefs.autoRouting,
      disabledAdapters: [...prefs.disabledAdapters],
      rankings: rankings.map(r => ({
        domain: r.domain,
        preferredAdapter: r.adapterId,
        score: Math.round(r.score * 100) / 100,
        calls: r.calls,
        successRate: Math.round(r.successRate * 1000) / 10,
        avgLatencyMs: Math.round(r.avgLatencyMs),
      })),
    })
  })

  router.post('/api/routing/preferences', (req, res) => {
    const body = req.body as { autoRouting?: unknown; disabledAdapters?: unknown }
    if (typeof body.autoRouting === 'boolean') setAutoRouting(body.autoRouting)
    if (Array.isArray(body.disabledAdapters) && body.disabledAdapters.every(x => typeof x === 'string')) {
      setDisabledAdapters(body.disabledAdapters as string[])
    }
    const prefs = getRoutingPrefs()
    res.json({ autoRouting: prefs.autoRouting, disabledAdapters: [...prefs.disabledAdapters] })
  })

  return router
}
