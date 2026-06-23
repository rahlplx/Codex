import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../../../backend/src/auth/password.js'

describe('hashPassword', () => {
  it('returns a string with salt:hash format', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).toContain(':')
    const parts = hash.split(':')
    expect(parts).toHaveLength(2)
    expect(parts[0]!.length).toBeGreaterThan(0)
    expect(parts[1]!.length).toBeGreaterThan(0)
  })

  it('generates different hashes for the same password (random salt)', async () => {
    const h1 = await hashPassword('same-password')
    const h2 = await hashPassword('same-password')
    expect(h1).not.toBe(h2)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('correct-password', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('returns false for malformed hash (no colon)', async () => {
    expect(await verifyPassword('anything', 'nocolon')).toBe(false)
  })

  it('returns false for empty hash', async () => {
    expect(await verifyPassword('anything', '')).toBe(false)
  })
})
