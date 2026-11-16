import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function key(secret: string) {
  if (secret.length < 32) throw new Error('Configura ELARA_SESSION_SECRET con al menos 32 caracteres.');
  return createHash('sha256').update(secret).digest();
}

export function sealSession(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function openSession<T>(value: string, secret: string): T | null {
  try {
    const raw = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')) as T;
  } catch { return null; }
}
