import { Router } from 'express'
import type { Database } from 'better-sqlite3'

export function createHealthRouter(db?: Database): Router {
  const router = Router()
  const dbProbe = db ? db.prepare('SELECT 1') : null

  router.get(['/health', '/api/health'], (_req, res) => {
    if (dbProbe) {
      try {
        dbProbe.get()
      } catch {
        res.status(503).json({ status: 'error', db: false, ts: new Date().toISOString() })
        return
      }
    }
    res.json({ status: 'ok', ts: new Date().toISOString() })
  })

  return router
}
