import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = process.env['ENCRYPTION_MASTER_KEY'] ?? 'dev-master-key-must-change-in-production';

function deriveKey(tenantId: string): Buffer {
  return createHash('sha256')
    .update(`${MASTER_KEY}:${tenantId}`)
    .digest();
}

export function encrypt(plaintext: string, tenantId: string): Buffer {
  const key = deriveKey(tenantId);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

export function decrypt(data: Buffer, tenantId: string): string {
  const key = deriveKey(tenantId);
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final('utf8');
}
