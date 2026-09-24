/** Sharp pipeline: full WebP ≤2400px edge, thumb WebP 480px cover. */
export const IMAGE_THUMB_WIDTH = 480
export const IMAGE_FULL_WIDTH = 2400

/**
 * Prefer an explicit thumb URL; otherwise derive `{id}-thumb.webp` from our
 * processed full URL. Returns null when no safe smaller derivative is known
 * (e.g. external / WordPress originals without a matching thumb).
 */
export function resolveImageThumbUrl(
  fullUrl: string | null | undefined,
  explicitThumb?: string | null,
): string | null {
  const explicit = explicitThumb?.trim()
  if (explicit) return explicit

  const raw = fullUrl?.trim()
  if (!raw) return null
  if (/-thumb\.[a-zA-Z0-9]+([?#]|$)/i.test(raw)) return raw
  if (!/\.webp([?#]|$)/i.test(raw)) return null
  return raw.replace(/\.webp([?#]|$)/i, '-thumb.webp$1')
}

export function buildImageSrcSet(
  fullUrl: string,
  thumbUrl: string | null,
): string | undefined {
  if (!thumbUrl || thumbUrl === fullUrl) return undefined
  return `${thumbUrl} ${IMAGE_THUMB_WIDTH}w, ${fullUrl} ${IMAGE_FULL_WIDTH}w`
}

/** Common card layouts in the journal listings. */
export const CARD_SIZES = {
  /** 3-col grid cards (~300–400px on desktop). */
  grid3: '(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 400px',
  /** 2-col grid cards. */
  grid2: '(max-width: 768px) 100vw, 50vw',
  /** Featured / wide hero card. */
  featured: '(max-width: 1024px) 100vw, 58vw',
  /** Search / compact row thumb. */
  compact: '(max-width: 768px) 96px, 120px',
  /** Gallery masonry tile. */
  gallery: '(max-width: 768px) 50vw, 33vw',
} as const

export type CardSizesKey = keyof typeof CARD_SIZES
