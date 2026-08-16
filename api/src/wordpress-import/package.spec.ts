import { mapWpPost } from './map';
import type { WpPost } from './types';
import {
  articleToExportJson,
  buildWordpressPackage,
  categoriesFromArticles,
  isWordpressPackage,
  parseArticlesFile,
  parseAuthorsJson,
  parseCategoriesJson,
} from './package';

const POST: WpPost = {
  id: 20220,
  date_gmt: '2026-08-14T12:27:13',
  slug: 'sportniat-psiholog',
  status: 'publish',
  title: { rendered: 'Спортният психолог' },
  excerpt: { rendered: '<p>Всеки от нас.</p>' },
  content: { rendered: '<p>Навън бягането е рутина.</p>' },
  author: 42,
  class_list: ['category-mestni-legendi', 'category-portreti'],
  _embedded: {
    author: [{ id: 42, name: 'Изабел Спасова', slug: 'izabel' }],
    'wp:featuredmedia': [
      {
        source_url:
          'http://prizni.bg/wp-content/uploads/2026/08/hero.jpg',
        caption: { rendered: '<p>Снимка: личен архив</p>' },
        alt_text: 'Владимир',
      },
    ],
    'wp:term': [
      [
        {
          name: 'Местни легенди',
          slug: 'mestni-legendi',
          taxonomy: 'category',
        },
        { name: 'Портрети', slug: 'portreti', taxonomy: 'category' },
      ],
    ],
  },
};

describe('wordpress export package', () => {
  it('round-trips a mapped article through export JSON', () => {
    const mapped = mapWpPost(POST);
    mapped.heroImage = {
      ...mapped.heroImage!,
      file: 'images/hero.jpg',
    };
    const packed = parseArticlesFile({
      version: 1,
      origin: 'https://prizni.bg',
      articles: [articleToExportJson(mapped)],
    });

    expect(packed.origin).toBe('https://prizni.bg');
    expect(packed.articles[0]?.titleBg).toBe('Спортният психолог');
    expect(packed.articles[0]?.authorSlug).toBe('izabel');
    expect(packed.articles[0]?.heroImage?.file).toBe('images/hero.jpg');
    expect(packed.articles[0]?.publishedAt?.toISOString()).toBe(
      mapped.publishedAt?.toISOString(),
    );
  });

  it('detects a package vs raw WordPress REST JSON', () => {
    expect(isWordpressPackage({ articles: [articleToExportJson(mapWpPost(POST))] })).toBe(
      true,
    );
    expect(isWordpressPackage([POST])).toBe(false);
  });

  it('collects unique categories and parses sidecar JSON', () => {
    const articles = [mapWpPost(POST)];
    expect(categoriesFromArticles(articles)).toEqual(
      expect.arrayContaining([
        { slug: 'mestni-legendi', nameBg: 'Местни легенди' },
        { slug: 'portreti', nameBg: 'portreti' },
      ]),
    );
    expect(parseAuthorsJson({ authors: [{ wpId: 42, email: 'a@b.c', name: 'A', slug: 'a', role: 'AUTHOR' }] })).toEqual([
      expect.objectContaining({ wpId: 42, email: 'a@b.c', slug: 'a' }),
    ]);
    expect(parseCategoriesJson([{ slug: 'portreti', nameBg: 'Портрети' }])).toEqual([
      { slug: 'portreti', nameBg: 'Портрети' },
    ]);
  });

  it('builds a versioned package', () => {
    const pkg = buildWordpressPackage({
      origin: 'https://prizni.bg',
      articles: [mapWpPost(POST)],
      authors: [],
    });
    expect(pkg.version).toBe(1);
    expect(pkg.articles).toHaveLength(1);
    expect(pkg.categories.length).toBeGreaterThan(0);
  });
});
