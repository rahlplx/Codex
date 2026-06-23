import crypto from 'node:crypto'

export interface JwtPayload {
  sub: string
  email: string
  role: 'admin' | 'user'
  iat: number
  exp: number
}

const SECRET = process.env['JWT_SECRET'] ?? crypto.randomBytes(32).toString('hex')
const EXPIRY_SECONDS = 86400

function base64url(data: string): string {
  return Buffer.from(data).toString('base64url')
}

export function generateToken(userId: string, email: string, role: 'admin' | 'user'): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url(JSON.stringify({ sub: userId, email, role, iat: now, exp: now + EXPIRY_SECONDS }))
  const signature = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

export function verifyToken(token: string): JwtPayload {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')
  const [header, payload, signature] = parts
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
  if (signature !== expected) throw new Error('Invalid signature')
  const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString()) as JwtPayload
  if (decoded.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')
  return decoded
}
