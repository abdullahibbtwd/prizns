import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma({
      article: {
        findMany: jest.fn().mockResolvedValue([
          {
            path: '/stories/test',
            updatedAt: new Date('2026-01-15'),
            publishedAt: new Date('2026-01-10'),
          },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        {
          provide: ConfigService,
          useValue: createMockConfig({ PUBLIC_SITE_URL: 'https://prizni.bg' }),
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SeoService);
  });

  it('builds sitemap xml with static and article urls', async () => {
    const xml = await service.sitemapXml();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('https://prizni.bg/stories');
    expect(xml).toContain('https://prizni.bg/stories/test');
  });

  it('builds robots.txt with sitemap reference', () => {
    const robots = service.robotsTxt();
    expect(robots).toContain('Sitemap: https://prizni.bg/sitemap.xml');
  });

  it('returns default bot shell html for known static paths', async () => {
    const result = await service.botShellHtml('/stories');
    expect(result.status).toBe(200);
    expect(result.html).toContain('<title>Prizni</title>');
    expect(result.html).toContain('https://prizni.bg/og-default.png');
    expect(result.html).toContain('summary_large_image');
  });

  it('returns 404 bot shell for unknown article slugs', async () => {
    const result = await service.botShellHtml('/stories/does-not-exist');
    expect(result.status).toBe(404);
    expect(result.html).toContain('Страницата не е намерена');
    expect(result.html).toContain('noindex,nofollow');
  });

  it('returns English bot shell with hreflang for /en paths', async () => {
    prisma.article.findFirst.mockResolvedValue({
      path: '/stories/village-life',
      titleBg: 'Селски живот',
      titleEn: 'Village life',
      subtitleBg: 'Сутрин',
      subtitleEn: 'Morning',
      seoTitleBg: 'Селски живот SEO',
      seoTitleEn: 'Village life SEO',
      seoDescriptionBg: 'Сутрин в долината',
      seoDescriptionEn: 'A morning in the valley',
      publishedAt: new Date('2026-01-10'),
      updatedAt: new Date('2026-01-15'),
      heroMedia: { url: 'https://cdn.example/hero.jpg' },
      author: { nameBg: 'Мая', nameEn: 'Maya' },
    });

    const result = await service.botShellHtml('/en/stories/village-life');
    expect(result.status).toBe(200);
    expect(result.html).toContain('lang="en"');
    expect(result.html).toContain('<title>Village life SEO | Prizni</title>');
    expect(result.html).toContain(
      'hreflang="en" href="https://prizni.bg/en/stories/village-life"',
    );
    expect(result.html).toContain(
      'hreflang="bg" href="https://prizni.bg/stories/village-life"',
    );
    expect(result.html).toContain(
      'rel="canonical" href="https://prizni.bg/en/stories/village-life"',
    );
  });

  it('returns article bot shell with og + json-ld for published stories', async () => {
    prisma.article.findFirst.mockResolvedValue({
      path: '/stories/village-life',
      titleBg: 'Селски живот',
      titleEn: 'Village life',
      subtitleBg: 'Сутрин',
      subtitleEn: 'Morning',
      seoTitleBg: 'Селски живот SEO',
      seoTitleEn: 'Village life SEO',
      seoDescriptionBg: 'Сутрин в долината',
      seoDescriptionEn: 'A morning in the valley',
      publishedAt: new Date('2026-01-10'),
      updatedAt: new Date('2026-01-15'),
      heroMedia: {
        url: 'https://cdn.example/wp-content/uploads/2024/hero-150x150.jpg',
      },
      author: { nameBg: 'Мая', nameEn: 'Maya' },
    });

    const result = await service.botShellHtml('/stories/village-life');
    expect(result.status).toBe(200);
    expect(result.html).toContain('<title>Селски живот SEO | Prizni</title>');
    expect(result.html).toContain(
      'hreflang="bg" href="https://prizni.bg/stories/village-life"',
    );
    expect(result.html).toContain(
      'hreflang="en" href="https://prizni.bg/en/stories/village-life"',
    );
    expect(result.html).toContain(
      'property="og:image" content="https://cdn.example/wp-content/uploads/2024/hero.jpg"',
    );
    expect(result.html).toContain('"@type":"Article"');
    expect(result.html).toContain('"headline":"Селски живот SEO"');
  });

  it('reports shell coverage from rendered bot-shell HTML, not DB fields alone', async () => {
    prisma.article.findMany.mockResolvedValue([
      {
        id: 'a1',
        path: 'stories/ok',
        section: 'traditions',
        titleBg: 'Обичай',
        titleEn: 'Custom',
        subtitleBg: 'Кратко',
        subtitleEn: null,
        seoTitleBg: 'SEO title',
        seoTitleEn: null,
        seoDescriptionBg: 'SEO description',
        seoDescriptionEn: null,
        publishedAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-01-15'),
        heroMedia: { url: 'https://cdn.example/hero.jpg' },
        author: { nameBg: 'Мая', nameEn: 'Maya' },
      },
      {
        id: 'a2',
        path: '/stories/gap',
        section: 'places',
        titleBg: 'Място',
        titleEn: null,
        subtitleBg: '',
        subtitleEn: null,
        seoTitleBg: null,
        seoTitleEn: '  ',
        seoDescriptionBg: null,
        seoDescriptionEn: null,
        publishedAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-01-15'),
        heroMedia: null,
        author: null,
      },
    ]);

    const overview = await service.cmsOverview();
    expect(overview.siteUrl).toBe('https://prizni.bg');
    expect(overview.sitemapUrl).toBe('https://prizni.bg/sitemap.xml');
    expect(overview.published).toBe(2);
    expect(overview.withUniqueMeta).toBe(1);
    expect(overview.missingTitle).toBe(0);
    expect(overview.missingDescription).toBe(1);
    expect(overview.coveragePct).toBe(50);
    expect(overview.evergreen).toEqual({ traditions: 1, places: 1 });
    expect(overview.gaps).toEqual([
      expect.objectContaining({
        id: 'a2',
        path: '/stories/gap',
        hasTitle: true,
        hasDescription: false,
      }),
    ]);
  });
});
