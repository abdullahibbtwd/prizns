/**
 * Prefer a large share/hero image over WordPress sized derivatives or our -thumb keys.
 * Facebook/LinkedIn need ~1200×630; WebP og:image is unreliable on Facebook.
 */

/** Recommended Facebook / Open Graph share size. */
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export function preferShareImageUrl(
  url: string | null | undefined,
): string | null {
  const raw = url?.trim()
  if (!raw) return null

  let next = raw
  // WordPress sized files: photo-150x150.jpg → photo.jpg
  next = next.replace(/-\d{2,4}x\d{2,4}(\.[a-zA-Z0-9]+)(?=[?#]|$)/, '$1')
  // Our processed thumbs: {id}-thumb.webp → {id}.webp
  next = next.replace(/-thumb(\.[a-zA-Z0-9]+)(?=[?#]|$)/, '$1')
  return next
}

/**
 * Derive the social/OG JPEG URL from a media URL.
 * `…/{id}.webp` → `…/{id}-og.jpg` (query strings preserved).
 */
export function toOgImageUrl(url: string | null | undefined): string | null {
  const preferred = preferShareImageUrl(url)
  if (!preferred) return null
  if (/-og\.jpe?g([?#]|$)/i.test(preferred)) return preferred
  if (/\.webp([?#]|$)/i.test(preferred)) {
    return preferred.replace(/\.webp([?#]|$)/i, '-og.jpg$1')
  }
  return preferred
}

export function isOgJpegUrl(url: string | null | undefined): boolean {
  const raw = url?.trim()
  if (!raw) return false
  return /-og\.jpe?g([?#]|$)/i.test(raw)
}

export function imageMimeFromUrl(url: string): string {
  const path = url.split('?')[0].toLowerCase()
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

/** Make sure og:image is always an absolute https? URL pointing at the OG JPEG when applicable. */
export function absoluteShareUrl(
  origin: string,
  url: string | null | undefined,
): string | null {
  const preferred = toOgImageUrl(url)
  if (!preferred) return null
  if (/^https?:\/\//i.test(preferred)) return preferred
  const base = origin.replace(/\/+$/, '')
  return `${base}${preferred.startsWith('/') ? preferred : `/${preferred}`}`
}
