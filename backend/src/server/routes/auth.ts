import { Router } from 'express'
import crypto from 'node:crypto'
import type { Database } from 'better-sqlite3'
import { hashPassword, verifyPassword } from '../../auth/password.js'
import { generateToken } from '../../auth/jwt.js'

export function createAuthRouter(db: Database): Router {
  const router = Router()

  router.post('/api/auth/register', async (req, res) => {
    const { email, password, displayName } = req.body as { email?: string; password?: string; displayName?: string }
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'email, password, and displayName required' })
      return
    }

    const existing = db.prepare('SELECT id FROM tenants WHERE email = ?').get(email)
    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    const tenantCount = (db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }).count
    const role = tenantCount === 0 ? 'admin' : 'user'

    db.prepare('INSERT INTO tenants (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(id, email, displayName, passwordHash, role)

    const token = generateToken(id, email, role)
    res.status(201).json({ token, user: { id, email, displayName, role, createdAt: new Date().toISOString() } })
  })

  router.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' })
      return
    }

    const tenant = db.prepare('SELECT id, email, display_name, password_hash, role, created_at FROM tenants WHERE email = ?').get(email) as
      | { id: string; email: string; display_name: string; password_hash: string; role: string; created_at: string }
      | undefined

    if (!tenant || !(await verifyPassword(password, tenant.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    db.prepare("UPDATE tenants SET last_active = datetime('now') WHERE id = ?").run(tenant.id)
    const token = generateToken(tenant.id, tenant.email, tenant.role as 'admin' | 'user')
    res.json({ token, user: { id: tenant.id, email: tenant.email, displayName: tenant.display_name, role: tenant.role, createdAt: tenant.created_at } })
  })

  return router
}
