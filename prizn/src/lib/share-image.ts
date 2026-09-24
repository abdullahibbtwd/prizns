/**
 * Prefer a large share/hero image over WordPress sized derivatives or our -thumb keys.
 * Facebook/LinkedIn need ~1200×630; 150×150 thumbs fail their validators.
 */
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

/** Make sure og:image is always an absolute https? URL. */
export function absoluteShareUrl(
  origin: string,
  url: string | null | undefined,
): string | null {
  const preferred = preferShareImageUrl(url)
  if (!preferred) return null
  if (/^https?:\/\//i.test(preferred)) return preferred
  const base = origin.replace(/\/+$/, '')
  return `${base}${preferred.startsWith('/') ? preferred : `/${preferred}`}`
}
