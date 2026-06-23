import { describe, it, expect, vi } from 'vitest'
import { authGuard, requireRole } from '../../../backend/src/auth/middleware.js'
import { generateToken } from '../../../backend/src/auth/jwt.js'
import type { Request, Response, NextFunction } from 'express'

function mockReq(headers: Record<string, string> = {}, tenant?: unknown): Request {
  return { headers, tenant } as unknown as Request
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) { res.statusCode = code; return res },
    json(data: unknown) { res.body = data; return res },
  }
  return res as unknown as Response
}

describe('authGuard', () => {
  it('calls next() with valid token', () => {
    const token = generateToken('u1', 'test@test.com', 'user')
    const req = mockReq({ authorization: `Bearer ${token}` })
    const res = mockRes()
    const next = vi.fn()

    authGuard(req, res, next as NextFunction)
    expect(next).toHaveBeenCalledOnce()
    expect(req.tenant).toBeDefined()
    expect(req.tenant?.sub).toBe('u1')
  })

  it('returns 401 when no authorization header', () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    authGuard(req, res, next as NextFunction)
    expect(next).not.toHaveBeenCalled()
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401)
  })

  it('returns 401 when header does not start with Bearer', () => {
    const req = mockReq({ authorization: 'Basic abc123' })
    const res = mockRes()
    const next = vi.fn()

    authGuard(req, res, next as NextFunction)
    expect(next).not.toHaveBeenCalled()
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401)
  })

  it('returns 401 for invalid token', () => {
    const req = mockReq({ authorization: 'Bearer invalid.token.here' })
    const res = mockRes()
    const next = vi.fn()

    authGuard(req, res, next as NextFunction)
    expect(next).not.toHaveBeenCalled()
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401)
  })
})

describe('requireRole', () => {
  it('calls next() when role matches', () => {
    const req = mockReq({}, { sub: 'u1', role: 'admin' })
    const res = mockRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next as NextFunction)
    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 403 when role does not match', () => {
    const req = mockReq({}, { sub: 'u1', role: 'user' })
    const res = mockRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next as NextFunction)
    expect(next).not.toHaveBeenCalled()
    expect((res as unknown as { statusCode: number }).statusCode).toBe(403)
  })

  it('returns 403 when no tenant on request', () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next as NextFunction)
    expect(next).not.toHaveBeenCalled()
    expect((res as unknown as { statusCode: number }).statusCode).toBe(403)
  })
})
