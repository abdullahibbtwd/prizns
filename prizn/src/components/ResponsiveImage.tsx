import type { ImgHTMLAttributes } from 'react'
import {
  buildImageSrcSet,
  CARD_SIZES,
  type CardSizesKey,
  resolveImageThumbUrl,
} from '@/lib/responsive-image'

type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'srcSet' | 'sizes'
> & {
  src: string
  /** Explicit 480px thumb from the API when available. */
  thumbSrc?: string | null
  /** Preset matching the card’s display width, or a custom sizes string. */
  sizes?: CardSizesKey | (string & {})
}

/**
 * Card/listing image that prefers the sharp 480px WebP thumb via srcset,
 * with the ≤2400px full WebP as the large candidate. Both derivatives are
 * already WebP; the <img> is the JPEG/legacy fallback when only one URL exists.
 */
export function ResponsiveImage({
  src,
  thumbSrc,
  sizes = 'grid3',
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: ResponsiveImageProps) {
  const full = src.trim()
  if (!full) return null

  const thumb = resolveImageThumbUrl(full, thumbSrc)
  const srcSet = buildImageSrcSet(full, thumb)
  const sizesAttr =
    sizes in CARD_SIZES ? CARD_SIZES[sizes as CardSizesKey] : sizes

  if (!srcSet) {
    return (
      <img
        src={full}
        alt={alt}
        loading={loading}
        decoding={decoding}
        {...rest}
      />
    )
  }

  // `contents` keeps layout/positioning on the <img> (absolute inset-0, etc.).
  return (
    <picture className="contents">
      <source type="image/webp" srcSet={srcSet} sizes={sizesAttr} />
      <img
        src={full}
        srcSet={srcSet}
        sizes={sizesAttr}
        alt={alt}
        loading={loading}
        decoding={decoding}
        {...rest}
      />
    </picture>
  )
}
