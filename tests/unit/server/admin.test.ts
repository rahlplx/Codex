import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createAdminRouter } from '../../../backend/src/server/routes/admin.js'
import { openDatabase } from '../../../backend/src/storage/database.js'
import { generateToken } from '../../../backend/src/auth/jwt.js'
import type { Database } from 'better-sqlite3'

function buildApp(db: Database) {
  const app = express()
  app.use(express.json())
  app.use(createAdminRouter(db))
  return app
}

function seedTenant(db: Database, id: string, email: string, role: string) {
  db.prepare('INSERT INTO tenants (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, email.split('@')[0], 'hash', role)
}

describe('Admin API', () => {
  let db: Database
  let app: express.Express
  let adminToken: string

  beforeEach(() => {
    db = openDatabase(':memory:')
    app = buildApp(db)
    seedTenant(db, 'admin-1', 'admin@test.com', 'admin')
    seedTenant(db, 'user-1', 'user@test.com', 'user')
    adminToken = generateToken('admin-1', 'admin@test.com', 'admin')
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/admin/tenants', () => {
    it('returns tenant list for admin', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/tenants')
      expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
      const userToken = generateToken('user-1', 'user@test.com', 'user')
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${userToken}`)
      expect(res.status).toBe(403)
    })
  })

  describe('PUT /api/admin/tenants/:id/role', () => {
    it('updates user role', async () => {
      const res = await request(app)
        .put('/api/admin/tenants/user-1/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
      expect(res.status).toBe(200)
      expect(res.body.updated).toBe(true)
    })

    it('returns 400 for invalid role', async () => {
      const res = await request(app)
        .put('/api/admin/tenants/user-1/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' })
      expect(res.status).toBe(400)
    })

    it('prevents self-demotion', async () => {
      const res = await request(app)
        .put('/api/admin/tenants/admin-1/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('demote')
    })

    it('returns 404 for unknown tenant', async () => {
      const res = await request(app)
        .put('/api/admin/tenants/nonexistent/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/tenants/:id', () => {
    it('deletes a tenant', async () => {
      const res = await request(app)
        .delete('/api/admin/tenants/user-1')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.deleted).toBe(true)
    })

    it('prevents self-deletion', async () => {
      const res = await request(app)
        .delete('/api/admin/tenants/admin-1')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('delete your own')
    })

    it('returns 404 for unknown tenant', async () => {
      const res = await request(app)
        .delete('/api/admin/tenants/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(404)
    })
  })
})
