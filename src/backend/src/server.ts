import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/connection.js';
import { runMigrations } from './db/migrations/runner.js';
import { mountRoutes } from './api/index.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const DATABASE_PATH = process.env['DATABASE_PATH'] ?? './data/codex.db';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = initializeDatabase(DATABASE_PATH);
runMigrations(db);

mountRoutes(app, db);

app.listen(PORT, () => {
  console.log(`Codex backend listening on port ${PORT}`);
  console.log(`Database: ${DATABASE_PATH}`);
});

export { app };
