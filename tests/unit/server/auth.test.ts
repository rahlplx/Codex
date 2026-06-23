import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createAuthRouter } from '../../../backend/src/server/routes/auth.js'
import { openDatabase } from '../../../backend/src/storage/database.js'
import type { Database } from 'better-sqlite3'

function buildApp(db: Database) {
  const app = express()
  app.use(express.json())
  app.use(createAuthRouter(db))
  return app
}

describe('Auth API', () => {
  let db: Database
  let app: express.Express

  beforeEach(() => {
    db = openDatabase(':memory:')
    app = buildApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: 'pass123', displayName: 'New User' })
      expect(res.status).toBe(201)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe('new@test.com')
    })

    it('first user gets admin role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'first@test.com', password: 'pass123', displayName: 'First' })
      expect(res.body.user.role).toBe('admin')
    })

    it('second user gets user role', async () => {
      await request(app).post('/api/auth/register')
        .send({ email: 'first@test.com', password: 'pass123', displayName: 'First' })
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'second@test.com', password: 'pass123', displayName: 'Second' })
      expect(res.body.user.role).toBe('user')
    })

    it('returns 400 when fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' })
      expect(res.status).toBe(400)
    })

    it('returns 409 for duplicate email', async () => {
      await request(app).post('/api/auth/register')
        .send({ email: 'dup@test.com', password: 'pass123', displayName: 'Dup' })
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@test.com', password: 'pass456', displayName: 'Dup2' })
      expect(res.status).toBe(409)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register')
        .send({ email: 'login@test.com', password: 'correctpass', displayName: 'Login User' })
    })

    it('returns token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'correctpass' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe('login@test.com')
    })

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'wrongpass' })
      expect(res.status).toBe(401)
    })

    it('returns 401 for unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'anything' })
      expect(res.status).toBe(401)
    })

    it('returns 400 when fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com' })
      expect(res.status).toBe(400)
    })
  })
})
