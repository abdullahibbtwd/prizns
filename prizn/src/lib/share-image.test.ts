import { describe, expect, it } from 'vitest'
import { absoluteShareUrl, preferShareImageUrl } from './share-image'

describe('preferShareImageUrl', () => {
  it('strips WordPress sized suffixes', () => {
    expect(
      preferShareImageUrl(
        'https://cdn.example/wp-content/uploads/2024/01/hero-150x150.jpg',
      ),
    ).toBe('https://cdn.example/wp-content/uploads/2024/01/hero.jpg')
  })

  it('strips local -thumb derivatives', () => {
    expect(preferShareImageUrl('/media/prizni/cms/abc-thumb.webp')).toBe(
      '/media/prizni/cms/abc.webp',
    )
  })

  it('absolutizes relative paths', () => {
    expect(
      absoluteShareUrl('https://stage2.prizni.bg', '/og-default.png'),
    ).toBe('https://stage2.prizni.bg/og-default.png')
  })
})
