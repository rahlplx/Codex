import { Router } from 'express';
import type Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { generateToken } from '../auth/jwt.js';
import type { LoginRequest, RegisterRequest } from '@codex/shared';

export function authRoutes(db: Database.Database): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body as RegisterRequest;

      if (!email || !password || !displayName) {
        res.status(400).json({ error: 'email, password, and displayName required' });
        return;
      }

      const existing = db.prepare('SELECT id FROM tenants WHERE email = ?').get(email);
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const id = uuid();
      const passwordHash = await hashPassword(password);

      const tenantCount = (
        db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }
      ).count;
      const role = tenantCount === 0 ? 'admin' : 'user';

      db.prepare(
        'INSERT INTO tenants (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      ).run(id, email, displayName, passwordHash, role);

      const token = generateToken(id, email, role);

      res.status(201).json({
        token,
        refreshToken: '',
        user: { id, email, displayName, role, createdAt: new Date().toISOString(), lastActive: null },
      });
    } catch (err) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body as LoginRequest;

      if (!email || !password) {
        res.status(400).json({ error: 'email and password required' });
        return;
      }

      const tenant = db
        .prepare('SELECT id, email, display_name, password_hash, role, created_at FROM tenants WHERE email = ?')
        .get(email) as
        | { id: string; email: string; display_name: string; password_hash: string; role: string; created_at: string }
        | undefined;

      if (!tenant) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const valid = await verifyPassword(password, tenant.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      db.prepare('UPDATE tenants SET last_active = datetime(\'now\') WHERE id = ?').run(tenant.id);

      const token = generateToken(tenant.id, tenant.email, tenant.role as 'admin' | 'user');

      res.json({
        token,
        refreshToken: '',
        user: {
          id: tenant.id,
          email: tenant.email,
          displayName: tenant.display_name,
          role: tenant.role,
          createdAt: tenant.created_at,
          lastActive: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  return router;
}
