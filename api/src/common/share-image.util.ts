/**
 * Prefer a large share/hero image over WordPress sized derivatives or our -thumb keys.
 * Facebook/LinkedIn need ~1200×630; 150×150 thumbs fail their validators.
 */

/** Recommended Facebook / Open Graph share size. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * Prefer a large share/hero image over WordPress sized derivatives or our -thumb keys.
 */
export function preferShareImageUrl(
  url: string | null | undefined,
): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  let next = raw;
  next = next.replace(/-\d{2,4}x\d{2,4}(\.[a-zA-Z0-9]+)(?=[?#]|$)/, '$1');
  next = next.replace(/-thumb(\.[a-zA-Z0-9]+)(?=[?#]|$)/, '$1');
  return next;
}

/**
 * Derive the social/OG JPEG URL from a media URL or storage key.
 * `cms/{id}.webp` → `cms/{id}-og.jpg` (query strings preserved).
 * Non-WebP assets (site PNG/JPEG) are left unchanged — they already work for FB.
 */
export function toOgImageUrl(url: string | null | undefined): string | null {
  const preferred = preferShareImageUrl(url);
  if (!preferred) return null;
  if (/-og\.jpe?g([?#]|$)/i.test(preferred)) return preferred;
  if (/\.webp([?#]|$)/i.test(preferred)) {
    return preferred.replace(/\.webp([?#]|$)/i, '-og.jpg$1');
  }
  return preferred;
}

/** True when the URL is our dedicated Open Graph JPEG derivative. */
export function isOgJpegUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  return /-og\.jpe?g([?#]|$)/i.test(raw);
}

/**
 * Storage object key for the OG JPEG sibling of a processed WebP key.
 * `cms/{id}.webp` → `cms/{id}-og.jpg`
 * Returns null when the key is not a full (non-thumb) WebP derivative.
 */
export function ogObjectKeyFromWebpKey(key: string | null | undefined): string | null {
  const raw = key?.trim();
  if (!raw) return null;
  if (raw.includes('..') || raw.startsWith('/')) return null;
  if (/-thumb\.webp$/i.test(raw)) return null;
  if (/-og\.jpe?g$/i.test(raw)) return raw;
  if (!/\.webp$/i.test(raw)) return null;
  return raw.replace(/\.webp$/i, '-og.jpg');
}

export function imageMimeFromUrl(url: string): string {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/** Make sure og:image is always an absolute https? URL pointing at the OG JPEG when applicable. */
export function absoluteShareUrl(
  origin: string,
  url: string | null | undefined,
): string | null {
  const preferred = toOgImageUrl(url);
  if (!preferred) return null;
  if (/^https?:\/\//i.test(preferred)) return preferred;
  const base = origin.replace(/\/+$/, '');
  return `${base}${preferred.startsWith('/') ? preferred : `/${preferred}`}`;
}
