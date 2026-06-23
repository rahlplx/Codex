import { Router } from 'express';
import type Database from 'better-sqlite3';

export function telemetryRoutes(_db: Database.Database): Router {
  const router = Router();

  router.get('/rankings', (_req, res) => {
    res.json([]);
  });

  router.get('/usage', (_req, res) => {
    res.json([]);
  });

  router.get('/reliability', (_req, res) => {
    res.json([]);
  });

  router.get('/speed', (_req, res) => {
    res.json([]);
  });

  return router;
}
