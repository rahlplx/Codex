import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRole } from '@codex/shared';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'codex-dev-secret-change-me';
const JWT_EXPIRY = '24h';

export function generateToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign({ sub: userId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
