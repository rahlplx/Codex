import crypto from 'node:crypto'

const ITERATIONS = 100000
const KEYLEN = 64
const DIGEST = 'sha512'

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST, (err, key) => {
      if (err) reject(err)
      else resolve(`${salt}:${key.toString('hex')}`)
    })
  })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, storedKey] = hash.split(':')
  if (!salt || !storedKey) return false
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST, (err, key) => {
      if (err) { reject(err); return }
      const stored = Buffer.from(storedKey, 'hex')
      if (key.length !== stored.length) { resolve(false); return }
      resolve(crypto.timingSafeEqual(key, stored))
    })
  })
}
