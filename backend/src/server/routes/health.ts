import { Router } from 'express'
import type { Database } from 'better-sqlite3'

export function createHealthRouter(db?: Database): Router {
  const router = Router()

  router.get(['/health', '/api/health'], (_req, res) => {
    if (db) {
      try {
        db.prepare('SELECT 1').get()
      } catch {
        res.status(503).json({ status: 'error', db: false, ts: new Date().toISOString() })
        return
      }
    }
    res.json({ status: 'ok', ts: new Date().toISOString() })
  })

  return router
}
