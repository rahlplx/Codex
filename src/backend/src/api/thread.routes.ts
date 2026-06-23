import { Router } from 'express';
import type Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

export function threadRoutes(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const tenantId = req.tenant?.sub;
    const threads = db
      .prepare('SELECT * FROM threads WHERE tenant_id = ? ORDER BY updated_at DESC')
      .all(tenantId);
    res.json(threads);
  });

  router.post('/', (req, res) => {
    const tenantId = req.tenant?.sub;
    const { title, model } = req.body as { title?: string; model?: string };
    const id = uuid();

    db.prepare(
      'INSERT INTO threads (id, tenant_id, title, model) VALUES (?, ?, ?, ?)',
    ).run(id, tenantId, title ?? null, model ?? null);

    const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(id);
    res.status(201).json(thread);
  });

  router.get('/:id', (req, res) => {
    const tenantId = req.tenant?.sub;
    const thread = db
      .prepare('SELECT * FROM threads WHERE id = ? AND tenant_id = ?')
      .get(req.params['id'], tenantId);

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }
    res.json(thread);
  });

  router.get('/:id/messages', (req, res) => {
    const tenantId = req.tenant?.sub;
    const thread = db
      .prepare('SELECT id FROM threads WHERE id = ? AND tenant_id = ?')
      .get(req.params['id'], tenantId);

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const messages = db
      .prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC')
      .all(req.params['id']);
    res.json(messages);
  });

  router.post('/:id/messages', (req, res) => {
    const tenantId = req.tenant?.sub;
    const thread = db
      .prepare('SELECT id FROM threads WHERE id = ? AND tenant_id = ?')
      .get(req.params['id'], tenantId);

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const { role, content } = req.body as { role: string; content: string };
    const id = uuid();

    db.prepare(
      'INSERT INTO messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)',
    ).run(id, req.params['id'], role, content);

    db.prepare('UPDATE threads SET updated_at = datetime(\'now\') WHERE id = ?').run(
      req.params['id'],
    );

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.status(201).json(message);
  });

  router.delete('/:id', (req, res) => {
    const tenantId = req.tenant?.sub;
    const result = db
      .prepare('DELETE FROM threads WHERE id = ? AND tenant_id = ?')
      .run(req.params['id'], tenantId);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
