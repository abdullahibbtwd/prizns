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

  it('returns default bot shell html for unknown paths', async () => {
    const html = await service.botShellHtml('/unknown');
    expect(html).toContain('<title>Prizni</title>');
    expect(html).toContain('https://prizni.bg/og-default.png');
    expect(html).toContain('summary_large_image');
  });

  it('reports unique-meta coverage for published stories', async () => {
    prisma.article.findMany.mockResolvedValue([
      {
        id: 'a1',
        path: 'stories/ok',
        section: 'traditions',
        titleBg: 'Обичай',
        titleEn: 'Custom',
        seoTitleBg: 'SEO title',
        seoTitleEn: null,
        seoDescriptionBg: 'SEO description',
        seoDescriptionEn: null,
      },
      {
        id: 'a2',
        path: '/stories/gap',
        section: 'places',
        titleBg: 'Място',
        titleEn: null,
        seoTitleBg: null,
        seoTitleEn: '  ',
        seoDescriptionBg: null,
        seoDescriptionEn: null,
      },
    ]);

    const overview = await service.cmsOverview();
    expect(overview.siteUrl).toBe('https://prizni.bg');
    expect(overview.sitemapUrl).toBe('https://prizni.bg/sitemap.xml');
    expect(overview.published).toBe(2);
    expect(overview.withUniqueMeta).toBe(1);
    expect(overview.missingTitle).toBe(1);
    expect(overview.missingDescription).toBe(1);
    expect(overview.coveragePct).toBe(50);
    expect(overview.evergreen).toEqual({ traditions: 1, places: 1 });
    expect(overview.gaps).toEqual([
      expect.objectContaining({
        id: 'a2',
        path: '/stories/gap',
        hasTitle: false,
        hasDescription: false,
      }),
    ]);
  });
});
