import { Router } from 'express'
import crypto from 'node:crypto'
import type { Database } from 'better-sqlite3'
import { hashPassword, verifyPassword } from '../../auth/password.js'
import { generateToken } from '../../auth/jwt.js'

// Simple in-memory rate limiter: max 5 login attempts per 15 minutes per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const loginAttemptsCleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, record] of loginAttempts.entries()) {
    if (record.resetAt < now) loginAttempts.delete(key)
  }
}, 15 * 60 * 1000)
loginAttemptsCleanup.unref()

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || record.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (record.count >= 5) return false
  record.count++
  return true
}

export function createAuthRouter(db: Database): Router {
  const router = Router()

  // Hoisted prepared statements — compiled once at startup
  const stmtFindByEmail = db.prepare('SELECT id FROM tenants WHERE email = ?')
  const stmtCountTenants = db.prepare('SELECT COUNT(*) as count FROM tenants')
  const stmtInsertTenant = db.prepare(
    'INSERT INTO tenants (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  )
  const stmtFindForLogin = db.prepare(
    'SELECT id, email, display_name, password_hash, role, created_at FROM tenants WHERE email = ?'
  )
  const stmtUpdateLastActive = db.prepare("UPDATE tenants SET last_active = datetime('now') WHERE id = ?")

  // Duplicate-email check + count + insert all run inside one transaction to close TOCTOU races
  const registerTenant = db.transaction((id: string, email: string, displayName: string, passwordHash: string) => {
    const existing = stmtFindByEmail.get(email)
    if (existing) return { conflict: true, role: 'user' as const }
    const { count } = stmtCountTenants.get() as { count: number }
    const role = count === 0 ? 'admin' as const : 'user' as const
    stmtInsertTenant.run(id, email, displayName, passwordHash, role)
    return { conflict: false, role }
  })

  router.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body as { email?: string; password?: string; displayName?: string }
      if (!email || !password || !displayName) {
        res.status(400).json({ error: 'email, password, and displayName required' })
        return
      }

      const id = crypto.randomUUID()
      const passwordHash = await hashPassword(password)

      const result = registerTenant(id, email, displayName, passwordHash)
      if (result.conflict) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      const token = generateToken(id, email, result.role)
      res.status(201).json({ token, user: { id, email, displayName, role: result.role, createdAt: new Date().toISOString() } })
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/api/auth/login', async (req, res) => {
    try {
      const ip = req.ip ?? 'unknown'
      if (!checkLoginRateLimit(ip)) {
        res.status(429).json({ error: 'Too many login attempts. Please try again later.' })
        return
      }

      const { email, password } = req.body as { email?: string; password?: string }
      if (!email || !password) {
        res.status(400).json({ error: 'email and password required' })
        return
      }

      const tenant = stmtFindForLogin.get(email) as
        | { id: string; email: string; display_name: string; password_hash: string; role: string; created_at: string }
        | undefined

      if (!tenant || !(await verifyPassword(password, tenant.password_hash))) {
        res.status(401).json({ error: 'Invalid credentials' })
        return
      }

      stmtUpdateLastActive.run(tenant.id)
      const token = generateToken(tenant.id, tenant.email, tenant.role as 'admin' | 'user')
      res.json({ token, user: { id: tenant.id, email: tenant.email, displayName: tenant.display_name, role: tenant.role, createdAt: tenant.created_at } })
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
