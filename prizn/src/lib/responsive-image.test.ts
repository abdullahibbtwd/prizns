import { describe, expect, it } from 'vitest'
import {
  buildImageSrcSet,
  resolveImageThumbUrl,
} from './responsive-image'

describe('resolveImageThumbUrl', () => {
  it('prefers an explicit thumb', () => {
    expect(
      resolveImageThumbUrl('/media/a.webp', '/media/a-thumb.webp'),
    ).toBe('/media/a-thumb.webp')
  })

  it('derives -thumb.webp for processed CMS assets', () => {
    expect(resolveImageThumbUrl('/media/prizni/cms/abc.webp')).toBe(
      '/media/prizni/cms/abc-thumb.webp',
    )
  })

  it('returns null for non-webp / external originals', () => {
    expect(
      resolveImageThumbUrl(
        'https://cdn.example/wp-content/uploads/2024/hero.jpg',
      ),
    ).toBeNull()
  })
})

describe('buildImageSrcSet', () => {
  it('emits thumb + full descriptors', () => {
    expect(
      buildImageSrcSet('/media/a.webp', '/media/a-thumb.webp'),
    ).toBe('/media/a-thumb.webp 480w, /media/a.webp 2400w')
  })

  it('skips when thumb is missing or identical', () => {
    expect(buildImageSrcSet('/media/a.webp', null)).toBeUndefined()
    expect(buildImageSrcSet('/media/a.webp', '/media/a.webp')).toBeUndefined()
  })
})
