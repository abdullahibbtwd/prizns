import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const VERSION = 'v1';

function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** AES-256-GCM → "v1:<iv>:<tag>:<ciphertext>" (base64url parts). */
export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, data]
    .map((part) =>
      typeof part === 'string' ? part : part.toString('base64url'),
    )
    .join(':');
}

/** Returns null when the payload is malformed or the key changed. */
export function decryptSecret(payload: string, secret: string): string | null {
  const [version, iv, tag, data] = payload.split(':');
  if (version !== VERSION || !iv || !tag || data === undefined) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyFrom(secret),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

/** "sk_live_…abcd" style hint so admins can tell which key is saved. */
export function maskSecret(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const prefix = /^[a-z]{2,6}_(?:live_|test_)?/.exec(v)?.[0] ?? '';
  return `${prefix}…${v.slice(-4)}`;
}
