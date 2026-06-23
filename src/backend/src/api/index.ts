import type { Express } from 'express';
import type Database from 'better-sqlite3';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { chatRoutes } from './chat.routes.js';
import { threadRoutes } from './thread.routes.js';
import { providerRoutes } from './provider.routes.js';
import { telemetryRoutes } from './telemetry.routes.js';
import { authGuard } from '../auth/middleware.js';

export function mountRoutes(app: Express, db: Database.Database): void {
  app.use('/api/health', healthRoutes());
  app.use('/api/auth', authRoutes(db));
  app.use('/api/chat', authGuard, chatRoutes(db));
  app.use('/api/threads', authGuard, threadRoutes(db));
  app.use('/api/providers', authGuard, providerRoutes(db));
  app.use('/api/telemetry', authGuard, telemetryRoutes(db));
}
