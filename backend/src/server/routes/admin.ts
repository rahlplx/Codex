import { Router } from 'express'
import type { Database } from 'better-sqlite3'
import { authGuard, requireRole } from '../../auth/middleware.js'

const adminGuard = [authGuard, requireRole('admin')] as const

export function createAdminRouter(db: Database): Router {
  const router = Router()

  router.get('/api/admin/tenants', ...adminGuard, (_req, res) => {
    const tenants = db.prepare(`
      SELECT t.id, t.email, t.display_name, t.role, t.created_at, t.last_active,
             COALESCE(u.total_tokens, 0) as total_tokens,
             COALESCE(u.total_requests, 0) as total_requests
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id,
               SUM(tokens_in + tokens_out) as total_tokens,
               COUNT(*) as total_requests
        FROM usage_log WHERE timestamp >= datetime('now', '-1 day')
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      ORDER BY t.created_at ASC
    `).all()
    res.json(tenants)
  })

  router.put('/api/admin/tenants/:id/role', ...adminGuard, (req, res) => {
    const { role } = req.body as { role?: string }
    if (role !== 'admin' && role !== 'user') {
      res.status(400).json({ error: 'role must be "admin" or "user"' })
      return
    }
    if (req.tenant?.sub === req.params.id && role !== 'admin') {
      res.status(400).json({ error: 'Cannot demote your own account' })
      return
    }
    const result = db.prepare('UPDATE tenants SET role = ? WHERE id = ?').run(role, req.params.id)
    if (result.changes === 0) { res.status(404).json({ error: 'Tenant not found' }); return }
    res.json({ updated: true })
  })

  router.delete('/api/admin/tenants/:id', ...adminGuard, (req, res) => {
    if (req.tenant?.sub === req.params.id) {
      res.status(400).json({ error: 'Cannot delete your own account' })
      return
    }
    try {
      const deleted = db.transaction(() => {
        db.prepare('DELETE FROM usage_log WHERE tenant_id = ?').run(req.params.id)
        db.prepare('DELETE FROM threads WHERE user_id = ?').run(req.params.id)
        const r = db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id)
        return r.changes
      })()
      if (deleted === 0) { res.status(404).json({ error: 'Tenant not found' }); return }
      res.json({ deleted: true })
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
