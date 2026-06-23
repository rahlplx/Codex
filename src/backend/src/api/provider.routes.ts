import { Router } from 'express';
import type Database from 'better-sqlite3';

export function providerRoutes(_db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json([
      { id: 'opencode-zen', name: 'OpenCode Zen', tier: 'free', status: 'active' },
      { id: 'openrouter-free', name: 'OpenRouter Free', tier: 'free', status: 'active' },
      { id: 'nemotron', name: 'NVIDIA NIM', tier: 'free', status: 'active' },
    ]);
  });

  return router;
}
