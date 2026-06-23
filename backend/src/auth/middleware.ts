import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type JwtPayload } from './jwt'

declare global {
  namespace Express {
    interface Request {
      tenant?: JwtPayload
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }
  try {
    req.tenant = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(role: 'admin' | 'user') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.tenant?.role !== role) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
