import { mapWpPost, parseWpPostsJson, pickAuthor, pickSection } from './map';
import type { WpPost } from './types';

const POST: WpPost = {
  id: 20220,
  date_gmt: '2026-08-14T12:27:13',
  slug: 'dvizhenieto-kato-chast-ot-choveka-sportniat-psiholog-vladimir-novkov',
  status: 'publish',
  title: {
    rendered: 'Движението като част от човека: спортният психолог Владимир Новков',
  },
  excerpt: {
    rendered:
      '<p>Всеки от нас има поне един познат – роднина, приятел, колега или съсед, за когото пробяганите десет километра сутрин преди&#8230;</p>',
  },
  content: {
    rendered:
      '<p>Всеки от нас има поне един познат.</p><h3><b>За избора на спорта</b></h3><p>Навън бягането е рутина.</p>',
  },
  class_list: ['category-mestni-legendi', 'category-portreti'],
  yoast_head_json: {
    title: 'Движението като част от човека: спортният психолог Владимир Новков | Prizni.bg',
    description: 'Владимир Новков е спортен психолог.',
    author: 'Изабел Спасова',
    twitter_misc: { 'Est. reading time': '8 минути' },
    schema: {
      '@graph': [
        {
          '@type': 'Person',
          name: 'Изабел Спасова',
          description: 'Емоционална и емпатична.',
          url: 'https://prizni.bg/author/izabel/',
        },
      ],
    },
  },
  _embedded: {
    author: [
      {
        code: 'rest_user_invalid_id',
        message: 'Invalid user ID.',
      },
    ],
    'wp:featuredmedia': [
      {
        id: 20223,
        source_url:
          'http://prizni.bg/wp-content/uploads/2026/08/Vladimir-Novkov-sporten-psiholog-intervyu.jpg',
        caption: { rendered: '<p>Снимка: личен архив</p>' },
      },
    ],
    'wp:term': [
      [
        {
          id: 33,
          name: 'Местни легенди',
          slug: 'mestni-legendi',
          taxonomy: 'category',
        },
        {
          id: 43,
          name: 'Портрети',
          slug: 'portreti',
          taxonomy: 'category',
        },
      ],
    ],
  },
};

describe('wordpress mapWpPost', () => {
  it('maps a published WP post onto journal fields', () => {
    const mapped = mapWpPost(POST);

    expect(mapped.slug).toBe(
      'dvizhenieto-kato-chast-ot-choveka-sportniat-psiholog-vladimir-novkov',
    );
    expect(mapped.section).toBe('sports');
    expect(mapped.path).toBe(
      '/sports/dvizhenieto-kato-chast-ot-choveka-sportniat-psiholog-vladimir-novkov',
    );
    expect(mapped.status).toBe('PUBLISHED');
    expect(mapped.categoryBg).toBe('Местни легенди');
    expect(mapped.categorySlugs).toEqual(['mestni-legendi', 'portreti']);
    expect(mapped.titleBg).toContain('Владимир Новков');
    expect(mapped.subtitleBg).toContain('Всеки от нас има поне един познат');
    expect(mapped.readTimeBg).toBe('8 мин четене');
    expect(mapped.dateBg).toBe('14 август 2026');
    expect(mapped.seoTitleBg).not.toContain('Prizni.bg');
    expect(mapped.authorNameBg).toBe('Изабел Спасова');
    expect(mapped.authorSlug).toBe('izabel');
    expect(mapped.heroImage?.src).toContain('Vladimir-Novkov-sporten-psiholog-intervyu.jpg');
    expect(mapped.heroImage?.src).toMatch(/^https:/);
    expect(mapped.photoCreditBg).toBe('Снимка: личен архив');
    expect(mapped.body[0]).toMatchObject({ type: 'paragraph' });
    expect(mapped.body.some((block) => block.type === 'note')).toBe(true);
  });

  it('uses Yoast person when the WP author embed is invalid', () => {
    expect(pickAuthor(POST)).toEqual({
      nameBg: 'Изабел Спасова',
      slug: 'izabel',
      bioBg: 'Емоционална и емпатична.',
    });
  });

  it('picks sports from the first matching WP category', () => {
    expect(
      pickSection([
        { slug: 'mestni-legendi', taxonomy: 'category' },
        { slug: 'portreti', taxonomy: 'category' },
      ]),
    ).toBe('sports');
  });

  it('parses a single post object from dumped JSON', () => {
    expect(parseWpPostsJson(POST)).toHaveLength(1);
    expect(parseWpPostsJson({ posts: [POST] })).toHaveLength(1);
  });
});
