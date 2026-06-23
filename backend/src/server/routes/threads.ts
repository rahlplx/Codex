import { Router } from 'express'
import type { Database } from 'better-sqlite3'
import type { Thread } from '../../types/thread.js'
import { ThreadRepository } from '../../storage/threads.js'
import { MessageRepository } from '../../storage/messages.js'
import { authGuard } from '../../auth/middleware.js'

export function createThreadsRouter(db: Database): Router {
  const router = Router()
  const threads = new ThreadRepository(db)
  const messages = new MessageRepository(db)

  router.use(authGuard)

  // List threads for the authenticated user
  router.get('/api/threads', (req, res) => {
    res.json(threads.list(req.tenant!.sub))
  })

  // Create thread — userId comes from JWT, not request body
  router.post('/api/threads', (req, res) => {
    const { title } = req.body as { title?: string }
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'title is required' })
      return
    }
    const thread = threads.create({ title: title.slice(0, 200), userId: req.tenant!.sub, archived: false })
    res.status(201).json(thread)
  })

  // Get thread by id — ownership enforced
  router.get('/api/threads/:id', (req, res) => {
    const thread = threads.findById(req.params['id']!)
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return }
    if (thread.userId !== req.tenant!.sub) { res.status(403).json({ error: 'Forbidden' }); return }
    res.json(thread)
  })

  // Update thread (rename / archive) — ownership enforced
  router.patch('/api/threads/:id', (req, res) => {
    const body = req.body as { title?: unknown; archived?: unknown } | undefined
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Request body must be an object' })
      return
    }
    const existing = threads.findById(req.params['id']!)
    if (!existing) { res.status(404).json({ error: 'Thread not found' }); return }
    if (existing.userId !== req.tenant!.sub) { res.status(403).json({ error: 'Forbidden' }); return }
    const patch: Partial<Pick<Thread, 'title' | 'archived'>> = {}
    if (typeof body.title === 'string') patch.title = body.title.slice(0, 200)
    if (typeof body.archived === 'boolean') patch.archived = body.archived
    const thread = threads.update(req.params['id']!, patch)
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return }
    res.json(thread)
  })

  // Delete thread — ownership enforced
  router.delete('/api/threads/:id', (req, res) => {
    const existing = threads.findById(req.params['id']!)
    if (!existing) { res.status(404).json({ error: 'Thread not found' }); return }
    if (existing.userId !== req.tenant!.sub) { res.status(403).json({ error: 'Forbidden' }); return }
    threads.delete(req.params['id']!)
    res.status(204).end()
  })

  // List messages for a thread — ownership enforced
  router.get('/api/threads/:id/messages', (req, res) => {
    const thread = threads.findById(req.params['id']!)
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return }
    if (thread.userId !== req.tenant!.sub) { res.status(403).json({ error: 'Forbidden' }); return }
    res.json(messages.listByThread(req.params['id']!))
  })

  // Add a message to a thread — ownership enforced
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
    const threadId = req.params['id']!
    const thread = threads.findById(threadId)
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return }
    if (thread.userId !== req.tenant!.sub) { res.status(403).json({ error: 'Forbidden' }); return }
    const createInput: Parameters<typeof messages.create>[0] = {
      threadId,
      role: role as 'system' | 'user' | 'assistant',
      content,
    }
    if (providerId !== undefined) createInput.providerId = providerId
    if (modelId !== undefined) createInput.modelId = modelId
    const msg = messages.create(createInput)
    threads.update(threadId, {})
    res.status(201).json(msg)
  })

  return router
}
