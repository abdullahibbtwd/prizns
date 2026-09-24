import {
  applyDownloadedFiles,
  collectMissingPackageImages,
  isUsableMediaAsset,
  isWordpressSizedDerivative,
  upgradeWordpressThumbnails,
  wordpressFullSizeUrl,
} from './repair-images';

describe('repair-images helpers', () => {
  it('keeps media already hosted on our server', () => {
    const prefixes = ['https://cdn.example/bucket/'];
    expect(
      isUsableMediaAsset(
        { size: 1200, url: 'https://cdn.example/bucket/wp/a.jpg' },
        prefixes,
      ),
    ).toBe(true);
    expect(
      isUsableMediaAsset(
        { size: null, url: 'https://cdn.example/bucket/wp/a.jpg' },
        prefixes,
      ),
    ).toBe(true);
  });

  it('re-uploads WordPress hotlinks even when a row exists', () => {
    const prefixes = ['https://cdn.example/bucket/'];
    expect(
      isUsableMediaAsset(
        {
          size: null,
          url: 'https://prizni.bg/wp-content/uploads/2024/a.jpg',
        },
        prefixes,
      ),
    ).toBe(false);
    expect(
      isUsableMediaAsset(
        {
          size: 1200,
          url: 'https://prizni.bg/wp-content/uploads/2024/a.jpg',
        },
        prefixes,
      ),
    ).toBe(false);
  });

  it('falls back to size when no hosted prefixes are configured', () => {
    expect(isUsableMediaAsset({ size: null, url: 'https://x/a.jpg' })).toBe(
      false,
    );
    expect(isUsableMediaAsset({ size: 0, url: 'https://x/a.jpg' })).toBe(false);
    expect(
      isUsableMediaAsset({
        size: 1200,
        url: 'https://prizni.bg/wp-content/uploads/a.jpg',
      }),
    ).toBe(false);
    expect(
      isUsableMediaAsset({ size: 1200, url: 'https://cdn.example/a.jpg' }),
    ).toBe(true);
  });

  it('collects hero, gallery, and author images missing file', () => {
    const missing = collectMissingPackageImages(
      [
        {
          slug: 'story-a',
          heroImage: { src: 'https://wp.example/a.jpg' },
          galleryImages: [
            { src: 'https://wp.example/b.jpg', file: 'images/b.jpg' },
            { src: 'https://wp.example/c.jpg' },
          ],
        },
      ],
      [{ slug: 'author-1', imageUrl: 'https://wp.example/avatar.jpg' }],
    );
    expect(missing).toEqual([
      { kind: 'hero', slug: 'story-a', src: 'https://wp.example/a.jpg' },
      { kind: 'gallery', slug: 'story-a', src: 'https://wp.example/c.jpg' },
      {
        kind: 'author',
        slug: 'author-1',
        src: 'https://wp.example/avatar.jpg',
      },
    ]);
  });

  it('patches file onto matching src entries including images[]', () => {
    const articles = [
      {
        slug: 'story-a',
        heroImage: { src: 'https://wp.example/a.jpg' },
        galleryImages: [{ src: 'https://wp.example/c.jpg' }],
        images: [{ src: 'https://wp.example/a.jpg' }],
      },
    ];
    const authors = [
      { slug: 'author-1', imageUrl: 'https://wp.example/avatar.jpg' },
    ];
    const patched = applyDownloadedFiles(
      articles,
      authors,
      new Map([
        ['https://wp.example/a.jpg', 'images/a.jpg'],
        ['https://wp.example/c.jpg', 'images/c.jpg'],
        ['https://wp.example/avatar.jpg', 'images/avatar.jpg'],
      ]),
    );
    expect(patched).toBe(4);
    expect(articles[0]?.heroImage).toMatchObject({ file: 'images/a.jpg' });
    expect(articles[0]?.galleryImages[0]).toMatchObject({
      file: 'images/c.jpg',
    });
    expect(articles[0]?.images[0]).toMatchObject({ file: 'images/a.jpg' });
    expect(authors[0]).toMatchObject({ imageFile: 'images/avatar.jpg' });
  });

  it('detects WordPress sized derivatives including -150x150', () => {
    expect(
      isWordpressSizedDerivative(
        'https://prizni.bg/wp-content/uploads/2023/11/kartina-tants-150x150.jpg',
      ),
    ).toBe(true);
    expect(
      wordpressFullSizeUrl(
        'https://prizni.bg/wp-content/uploads/2023/11/kartina-tants-150x150.jpg',
      ),
    ).toBe(
      'https://prizni.bg/wp-content/uploads/2023/11/kartina-tants.jpg',
    );
    expect(
      isWordpressSizedDerivative(
        'https://prizni.bg/wp-content/uploads/2020/06/1920x1080.jpg',
      ),
    ).toBe(false);
  });

  it('upgrades successful -150x150 downloads to full-size src and clears file', () => {
    const articles = [
      {
        slug: 'story-a',
        heroImage: {
          src: 'https://wp.example/hero.jpg',
          file: 'images/hero.jpg',
        },
        galleryImages: [
          {
            src: 'https://wp.example/photo-150x150.jpg',
            file: 'images/photo-150x150.jpg',
          },
        ],
        body: [
          {
            type: 'image',
            url: 'https://wp.example/photo-150x150.jpg',
            captionBg: '',
          },
        ],
      },
    ];
    const { upgraded, pendingDownloads } = upgradeWordpressThumbnails(
      articles,
      [],
    );
    expect(upgraded).toBe(2);
    expect(articles[0]?.galleryImages[0]).toEqual({
      src: 'https://wp.example/photo.jpg',
    });
    expect(articles[0]?.body[0]).toMatchObject({
      url: 'https://wp.example/photo.jpg',
    });
    expect(articles[0]?.heroImage).toMatchObject({
      src: 'https://wp.example/hero.jpg',
      file: 'images/hero.jpg',
    });
    expect(pendingDownloads).toEqual([
      {
        kind: 'gallery',
        slug: 'story-a',
        src: 'https://wp.example/photo.jpg',
      },
    ]);
  });
});
