import crypto from 'node:crypto'

export interface JwtPayload {
  sub: string
  email: string
  role: 'admin' | 'user'
  iat: number
  exp: number
}

const jwtSecret = process.env['JWT_SECRET']
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable must be set to a secure random value (min 32 chars)')
}
const SECRET = jwtSecret
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

  const signatureBuffer = Buffer.from(signature!, 'base64url')
  const expectedBuffer = Buffer.from(expected, 'base64url')
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid signature')
  }

  const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString())
  if (!decoded || typeof decoded !== 'object' || typeof decoded.exp !== 'number') {
    throw new Error('Invalid token payload')
  }
  if (decoded.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')
  return decoded as JwtPayload
}
