import {
  absoluteShareUrl,
  imageMimeFromUrl,
  isOgJpegUrl,
  ogObjectKeyFromWebpKey,
  preferShareImageUrl,
  toOgImageUrl,
} from './share-image.util';

describe('share-image.util', () => {
  it('strips WordPress sized suffixes and thumbs', () => {
    expect(
      preferShareImageUrl(
        'https://cdn.example/wp-content/uploads/2024/01/hero-150x150.jpg',
      ),
    ).toBe('https://cdn.example/wp-content/uploads/2024/01/hero.jpg');
    expect(preferShareImageUrl('/media/prizn/cms/abc-thumb.webp')).toBe(
      '/media/prizn/cms/abc.webp',
    );
  });

  it('derives -og.jpg from webp URLs and keys', () => {
    expect(toOgImageUrl('/media/prizn/cms/abc.webp')).toBe(
      '/media/prizn/cms/abc-og.jpg',
    );
    expect(toOgImageUrl('/media/prizn/cms/abc-thumb.webp')).toBe(
      '/media/prizn/cms/abc-og.jpg',
    );
    expect(
      toOgImageUrl('https://prizni.bg/media/prizn/cms/abc.webp?v=1'),
    ).toBe('https://prizni.bg/media/prizn/cms/abc-og.jpg?v=1');
    expect(toOgImageUrl('/village.jpg')).toBe('/village.jpg');
    expect(ogObjectKeyFromWebpKey('cms/abc.webp')).toBe('cms/abc-og.jpg');
    expect(ogObjectKeyFromWebpKey('cms/abc-thumb.webp')).toBeNull();
    expect(ogObjectKeyFromWebpKey('cms/abc-og.jpg')).toBe('cms/abc-og.jpg');
  });

  it('absolutizes OG URLs with configurable origin', () => {
    expect(
      absoluteShareUrl(
        'https://stage2.prizni.bg',
        '/media/prizn/cms/abc.webp',
      ),
    ).toBe('https://stage2.prizni.bg/media/prizn/cms/abc-og.jpg');
    expect(absoluteShareUrl('https://stage2.prizni.bg', '/og-default.png')).toBe(
      'https://stage2.prizni.bg/og-default.png',
    );
  });

  it('detects mime and og jpeg urls', () => {
    expect(imageMimeFromUrl('https://x/a-og.jpg')).toBe('image/jpeg');
    expect(imageMimeFromUrl('https://x/a.webp')).toBe('image/webp');
    expect(imageMimeFromUrl('https://x/a.png')).toBe('image/png');
    expect(isOgJpegUrl('https://x/a-og.jpg')).toBe(true);
    expect(isOgJpegUrl('https://x/a.webp')).toBe(false);
  });
});
