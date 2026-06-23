import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../backend/src/server/httpServer.js'
import { openDatabase } from '../../../backend/src/storage/database.js'
import { generateToken } from '../../../backend/src/auth/jwt.js'
import type { Database } from 'better-sqlite3'
import type { Express } from 'express'

function seedUser(db: Database, id: string, email: string, role: 'admin' | 'user' = 'user') {
  db.prepare('INSERT INTO tenants (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, email.split('@')[0], 'hash', role)
}

describe('Threads API', () => {
  let db: Database
  let app: Express
  let token: string
  let userId: string

  beforeEach(() => {
    db = openDatabase(':memory:')
    app = createApp(undefined, db)
    userId = 'user-1'
    seedUser(db, userId, 'test@example.com')
    token = generateToken(userId, 'test@example.com', 'user')
  })

  afterEach(() => {
    db.close()
  })

  describe('POST /api/threads', () => {
    it('returns 201 with a created thread', async () => {
      const res = await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test Thread' })
      expect(res.status).toBe(201)
      expect(res.body.title).toBe('Test Thread')
      expect(res.body.id).toBeDefined()
      expect(res.body.userId).toBe(userId)
    })

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({})
      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/threads').send({ title: 'No auth' })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/threads', () => {
    it('returns threads for the authenticated user', async () => {
      await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'A' })
      await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'B' })

      const res = await request(app).get('/api/threads').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('does not return another user\'s threads', async () => {
      seedUser(db, 'user-2', 'other@example.com')
      const otherToken = generateToken('user-2', 'other@example.com', 'user')
      await request(app).post('/api/threads').set('Authorization', `Bearer ${otherToken}`).send({ title: 'Other' })

      const res = await request(app).get('/api/threads').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(0)
    })

    it('returns empty array when user has no threads', async () => {
      const res = await request(app).get('/api/threads').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/threads')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/threads/:id', () => {
    it('returns 200 for own thread', async () => {
      const created = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Find Me' })
      const res = await request(app).get(`/api/threads/${created.body.id}`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Find Me')
    })

    it('returns 403 for another user\'s thread', async () => {
      seedUser(db, 'user-2', 'other@example.com')
      const otherToken = generateToken('user-2', 'other@example.com', 'user')
      const created = await request(app).post('/api/threads').set('Authorization', `Bearer ${otherToken}`).send({ title: 'Private' })

      const res = await request(app).get(`/api/threads/${created.body.id}`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/threads/nonexistent').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/threads/:id', () => {
    it('updates the title', async () => {
      const created = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Old' })
      const res = await request(app)
        .patch(`/api/threads/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('New')
    })

    it('updates archived flag', async () => {
      const created = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Archivable' })
      const res = await request(app)
        .patch(`/api/threads/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ archived: true })
      expect(res.status).toBe(200)
      expect(res.body.archived).toBe(true)
    })

    it('returns 403 for another user\'s thread', async () => {
      seedUser(db, 'user-2', 'other@example.com')
      const otherToken = generateToken('user-2', 'other@example.com', 'user')
      const created = await request(app).post('/api/threads').set('Authorization', `Bearer ${otherToken}`).send({ title: 'Private' })

      const res = await request(app)
        .patch(`/api/threads/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Hijacked' })
      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).patch('/api/threads/nonexistent').set('Authorization', `Bearer ${token}`).send({ title: 'X' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/threads/:id', () => {
    it('returns 204 on success', async () => {
      const created = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Delete Me' })
      const res = await request(app).delete(`/api/threads/${created.body.id}`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(204)
    })

    it('returns 403 for another user\'s thread', async () => {
      seedUser(db, 'user-2', 'other@example.com')
      const otherToken = generateToken('user-2', 'other@example.com', 'user')
      const created = await request(app).post('/api/threads').set('Authorization', `Bearer ${otherToken}`).send({ title: 'Private' })

      const res = await request(app).delete(`/api/threads/${created.body.id}`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).delete('/api/threads/nonexistent').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/threads/:id/messages', () => {
    it('creates a message in a thread', async () => {
      const thread = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Chat' })
      const res = await request(app)
        .post(`/api/threads/${thread.body.id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'user', content: 'Hello!' })
      expect(res.status).toBe(201)
      expect(res.body.content).toBe('Hello!')
      expect(res.body.role).toBe('user')
    })

    it('returns 400 when role is missing', async () => {
      const thread = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Chat' })
      const res = await request(app)
        .post(`/api/threads/${thread.body.id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Hello!' })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid role', async () => {
      const thread = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Chat' })
      const res = await request(app)
        .post(`/api/threads/${thread.body.id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'villain', content: 'Mwahaha' })
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent thread', async () => {
      const res = await request(app)
        .post('/api/threads/nonexistent/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'user', content: 'Hello!' })
      expect(res.status).toBe(404)
    })

    it('returns 403 for another user\'s thread', async () => {
      seedUser(db, 'user-2', 'other@example.com')
      const otherToken = generateToken('user-2', 'other@example.com', 'user')
      const thread = await request(app).post('/api/threads').set('Authorization', `Bearer ${otherToken}`).send({ title: 'Private' })

      const res = await request(app)
        .post(`/api/threads/${thread.body.id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'user', content: 'Injected' })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/threads/:id/messages', () => {
    it('returns messages in order', async () => {
      const thread = await request(app).post('/api/threads').set('Authorization', `Bearer ${token}`).send({ title: 'Chat' })
      await request(app).post(`/api/threads/${thread.body.id}/messages`).set('Authorization', `Bearer ${token}`).send({ role: 'user', content: 'First' })
      await request(app).post(`/api/threads/${thread.body.id}/messages`).set('Authorization', `Bearer ${token}`).send({ role: 'assistant', content: 'Second' })

      const res = await request(app).get(`/api/threads/${thread.body.id}/messages`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body[0].content).toBe('First')
      expect(res.body[1].content).toBe('Second')
    })

    it('returns 403 for another user\'s thread messages', async () => {
      seedUser(db, 'user-2', 'other@example.com')
      const otherToken = generateToken('user-2', 'other@example.com', 'user')
      const thread = await request(app).post('/api/threads').set('Authorization', `Bearer ${otherToken}`).send({ title: 'Private' })

      const res = await request(app).get(`/api/threads/${thread.body.id}/messages`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(403)
    })
  })
})
