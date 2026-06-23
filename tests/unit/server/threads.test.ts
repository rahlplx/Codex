import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../backend/src/server/httpServer.js'
import { openDatabase } from '../../../backend/src/storage/database.js'
import type { Database } from 'better-sqlite3'
import type { Express } from 'express'

describe('Threads API', () => {
  let db: Database
  let app: Express

  beforeEach(() => {
    db = openDatabase(':memory:')
    app = createApp(undefined, db)
  })

  afterEach(() => {
    db.close()
  })

  describe('POST /api/threads', () => {
    it('returns 201 with a created thread', async () => {
      const res = await request(app)
        .post('/api/threads')
        .send({ title: 'Test Thread', userId: 'user-1' })
      expect(res.status).toBe(201)
      expect(res.body.title).toBe('Test Thread')
      expect(res.body.id).toBeDefined()
    })

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/threads')
        .send({ userId: 'user-1' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/threads', () => {
    it('returns threads for user', async () => {
      await request(app).post('/api/threads').send({ title: 'A', userId: 'u1' })
      await request(app).post('/api/threads').send({ title: 'B', userId: 'u1' })

      const res = await request(app).get('/api/threads?userId=u1')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('returns empty array for unknown user', async () => {
      const res = await request(app).get('/api/threads?userId=nobody')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('GET /api/threads/:id', () => {
    it('returns 200 for existing thread', async () => {
      const created = await request(app).post('/api/threads').send({ title: 'Find Me', userId: 'u1' })
      const res = await request(app).get(`/api/threads/${created.body.id}`)
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Find Me')
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/threads/nonexistent')
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/threads/:id', () => {
    it('updates the title', async () => {
      const created = await request(app).post('/api/threads').send({ title: 'Old', userId: 'u1' })
      const res = await request(app)
        .patch(`/api/threads/${created.body.id}`)
        .send({ title: 'New' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('New')
    })

    it('updates archived flag', async () => {
      const created = await request(app).post('/api/threads').send({ title: 'Archivable', userId: 'u1' })
      const res = await request(app)
        .patch(`/api/threads/${created.body.id}`)
        .send({ archived: true })
      expect(res.status).toBe(200)
      expect(res.body.archived).toBe(true)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).patch('/api/threads/nonexistent').send({ title: 'X' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/threads/:id', () => {
    it('returns 204 on success', async () => {
      const created = await request(app).post('/api/threads').send({ title: 'Delete Me', userId: 'u1' })
      const res = await request(app).delete(`/api/threads/${created.body.id}`)
      expect(res.status).toBe(204)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).delete('/api/threads/nonexistent')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/threads/:id/messages', () => {
    it('creates a message in a thread', async () => {
      const thread = await request(app).post('/api/threads').send({ title: 'Chat', userId: 'u1' })
      const res = await request(app)
        .post(`/api/threads/${thread.body.id}/messages`)
        .send({ role: 'user', content: 'Hello!' })
      expect(res.status).toBe(201)
      expect(res.body.content).toBe('Hello!')
      expect(res.body.role).toBe('user')
    })

    it('returns 400 when role is missing', async () => {
      const thread = await request(app).post('/api/threads').send({ title: 'Chat', userId: 'u1' })
      const res = await request(app)
        .post(`/api/threads/${thread.body.id}/messages`)
        .send({ content: 'Hello!' })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid role', async () => {
      const thread = await request(app).post('/api/threads').send({ title: 'Chat', userId: 'u1' })
      const res = await request(app)
        .post(`/api/threads/${thread.body.id}/messages`)
        .send({ role: 'villain', content: 'Mwahaha' })
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent thread', async () => {
      const res = await request(app)
        .post('/api/threads/nonexistent/messages')
        .send({ role: 'user', content: 'Hello!' })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/threads/:id/messages', () => {
    it('returns messages in order', async () => {
      const thread = await request(app).post('/api/threads').send({ title: 'Chat', userId: 'u1' })
      await request(app).post(`/api/threads/${thread.body.id}/messages`).send({ role: 'user', content: 'First' })
      await request(app).post(`/api/threads/${thread.body.id}/messages`).send({ role: 'assistant', content: 'Second' })

      const res = await request(app).get(`/api/threads/${thread.body.id}/messages`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body[0].content).toBe('First')
      expect(res.body[1].content).toBe('Second')
    })
  })
})
