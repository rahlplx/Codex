import { createCipheriv, createDecipheriv, randomBytes, hkdfSync } from 'node:crypto'

const ALG = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

export function deriveEncryptionKey(secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, '', 'codex-tenant-keys', 32))
}

export function encrypt(plaintext: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted])
}

export function decrypt(encrypted: Buffer, key: Buffer): string {
  const iv = encrypted.subarray(0, IV_LEN)
  const tag = encrypted.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ciphertext = encrypted.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}
