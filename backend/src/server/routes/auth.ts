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

  router.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body as { email?: string; password?: string; displayName?: string }
      if (!email || !password || !displayName) {
        res.status(400).json({ error: 'email, password, and displayName required' })
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Invalid email format' })
        return
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' })
        return
      }

      const existing = db.prepare('SELECT id FROM tenants WHERE email = ?').get(email)
      if (existing) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      const id = crypto.randomUUID()
      const passwordHash = await hashPassword(password)

      // Wrap count+insert in a transaction to prevent TOCTOU race on first-admin election
      const insertTenant = db.transaction(() => {
        const { count } = db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }
        const role = count === 0 ? 'admin' : 'user'
        db.prepare('INSERT INTO tenants (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(id, email, displayName, passwordHash, role)
        return role
      })
      const role = insertTenant()

      const token = generateToken(id, email, role)
      res.status(201).json({ token, user: { id, email, displayName, role, createdAt: new Date().toISOString() } })
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
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
