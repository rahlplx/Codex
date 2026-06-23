import { describe, it, expect } from 'vitest'
import { deriveEncryptionKey, encrypt, decrypt } from '../../../backend/src/auth/encryption.js'

const TEST_SECRET = 'a'.repeat(32)

describe('API key encryption (AES-256-GCM)', () => {
  it('encrypt returns a Buffer that differs from plaintext', () => {
    const key = deriveEncryptionKey(TEST_SECRET)
    const plaintext = 'sk-my-secret-api-key-12345'
    const encrypted = encrypt(plaintext, key)
    expect(Buffer.isBuffer(encrypted)).toBe(true)
    expect(encrypted.toString('utf8')).not.toBe(plaintext)
  })

  it('decrypt(encrypt(plaintext)) round-trips to original', () => {
    const key = deriveEncryptionKey(TEST_SECRET)
    const plaintext = 'sk-my-secret-api-key-12345'
    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })

  it('decrypt throws on tampered ciphertext', () => {
    const key = deriveEncryptionKey(TEST_SECRET)
    const encrypted = encrypt('secret', key)
    encrypted[encrypted.length - 1] ^= 0xff
    expect(() => decrypt(encrypted, key)).toThrow()
  })

  it('two encryptions of the same plaintext produce different ciphertexts', () => {
    const key = deriveEncryptionKey(TEST_SECRET)
    const a = encrypt('same-key', key)
    const b = encrypt('same-key', key)
    expect(a.equals(b)).toBe(false)
  })
})
