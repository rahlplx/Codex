import { Router } from 'express'
import type { Database } from 'better-sqlite3'
import { ThreadRepository } from '../../storage/threads'
import { MessageRepository } from '../../storage/messages'

export function createThreadsRouter(db: Database): Router {
  const router = Router()
  const threads = new ThreadRepository(db)
  const messages = new MessageRepository(db)

  // List threads for a user
  router.get('/api/threads', (req, res) => {
    const userId = typeof req.query['userId'] === 'string' ? req.query['userId'] : 'default'
    res.json(threads.list(userId))
  })

  // Create thread
  router.post('/api/threads', (req, res) => {
    const { title, userId } = req.body as { title?: string; userId?: string }
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'title is required' })
      return
    }
    const thread = threads.create({ title: title.slice(0, 200), userId: userId ?? 'default', archived: false })
    res.status(201).json(thread)
  })

  // Get thread by id
  router.get('/api/threads/:id', (req, res) => {
    const thread = threads.findById(req.params['id']!)
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return }
    res.json(thread)
  })

  // Update thread (rename / archive)
  router.patch('/api/threads/:id', (req, res) => {
    const { title, archived } = req.body as { title?: string; archived?: boolean }
    const thread = threads.update(req.params['id']!, { title, archived })
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return }
    res.json(thread)
  })

  // Delete thread
  router.delete('/api/threads/:id', (req, res) => {
    const ok = threads.delete(req.params['id']!)
    if (!ok) { res.status(404).json({ error: 'Thread not found' }); return }
    res.status(204).end()
  })

  // List messages for a thread
  router.get('/api/threads/:id/messages', (req, res) => {
    res.json(messages.listByThread(req.params['id']!))
  })

  // Add a message to a thread
  router.post('/api/threads/:id/messages', (req, res) => {
    const { role, content, providerId, modelId } = req.body as {
      role?: string; content?: string; providerId?: string; modelId?: string
    }
    if (!role || !content) {
      res.status(400).json({ error: 'role and content are required' })
      return
    }
    if (!['system', 'user', 'assistant'].includes(role)) {
      res.status(400).json({ error: 'role must be system, user, or assistant' })
      return
    }
    const msg = messages.create({
      threadId: req.params['id']!,
      role: role as 'system' | 'user' | 'assistant',
      content,
      providerId,
      modelId,
    })
    // Bump thread updatedAt so the list stays sorted by activity
    threads.update(req.params['id']!, {})
    res.status(201).json(msg)
  })

  return router
}
