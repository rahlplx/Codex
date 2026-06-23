import { describe, it, expect } from 'vitest'
import { generateToken, verifyToken } from '../../../backend/src/auth/jwt.js'

describe('JWT — generateToken', () => {
  it('returns a string with 3 dot-separated parts', () => {
    const token = generateToken('user-1', 'test@example.com', 'user')
    expect(token.split('.')).toHaveLength(3)
  })

  it('generates different tokens for different users', () => {
    const t1 = generateToken('user-1', 'a@a.com', 'user')
    const t2 = generateToken('user-2', 'b@b.com', 'user')
    expect(t1).not.toBe(t2)
  })
})

describe('JWT — verifyToken', () => {
  it('decodes a valid token', () => {
    const token = generateToken('user-1', 'test@example.com', 'admin')
    const payload = verifyToken(token)
    expect(payload.sub).toBe('user-1')
    expect(payload.email).toBe('test@example.com')
    expect(payload.role).toBe('admin')
  })

  it('includes iat and exp fields', () => {
    const token = generateToken('user-1', 'test@example.com', 'user')
    const payload = verifyToken(token)
    expect(typeof payload.iat).toBe('number')
    expect(typeof payload.exp).toBe('number')
    expect(payload.exp).toBeGreaterThan(payload.iat)
  })

  it('throws on invalid token format', () => {
    expect(() => verifyToken('not.valid')).toThrow('Invalid token format')
  })

  it('throws on tampered signature', () => {
    const token = generateToken('user-1', 'test@example.com', 'user')
    const parts = token.split('.')
    parts[2] = 'tampered_signature_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    expect(() => verifyToken(parts.join('.'))).toThrow()
  })

  it('throws on tampered payload', () => {
    const token = generateToken('user-1', 'test@example.com', 'user')
    const parts = token.split('.')
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString())
    payload.role = 'admin'
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url')
    expect(() => verifyToken(parts.join('.'))).toThrow()
  })
})
