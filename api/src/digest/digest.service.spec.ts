import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus, SeriesStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { DigestService } from './digest.service';

describe('DigestService', () => {
  let service: DigestService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const mail = { isConfigured: jest.fn().mockReturnValue(true), send: jest.fn() };

  beforeEach(async () => {
    prisma = createMockPrisma({
      series: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'series-1',
            slug: 'tales',
            titleBg: 'Истории',
            titleEn: 'Tales',
            status: SeriesStatus.ACTIVE,
            episodes: [
              {
                sortOrder: 0,
                articleId: 'art-1',
                article: {
                  id: 'art-1',
                  status: ArticleStatus.PUBLISHED,
                  titleBg: 'Ep 1',
                  titleEn: null,
                  path: '/stories/ep-1',
                  slug: 'ep-1',
                  publishedAt: new Date(),
                },
              },
            ],
            digestSends: [],
          },
        ]),
        findFirst: jest.fn().mockResolvedValue({
          id: 'series-1',
          slug: 'tales',
          titleBg: 'Истории',
          titleEn: 'Tales',
          status: SeriesStatus.ACTIVE,
          episodes: [
            {
              sortOrder: 0,
              article: {
                id: 'art-1',
                status: ArticleStatus.PUBLISHED,
                titleBg: 'Ep 1',
                titleEn: null,
                path: '/stories/ep-1',
                slug: 'ep-1',
                publishedAt: new Date(),
              },
            },
          ],
        }),
      },
      newsletterSubscriber: { count: jest.fn().mockResolvedValue(5) },
      episodeDigestSend: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        {
          provide: ConfigService,
          useValue: createMockConfig({ PUBLIC_SITE_URL: 'https://prizni.bg' }),
        },
      ],
    }).compile();

    service = module.get(DigestService);
  });

  it('previews next episode and subscriber count', async () => {
    const preview = await service.preview();
    expect(preview.subscriberCount).toBe(5);
    expect(preview.next).toBeTruthy();
  });

  it('returns empty history', async () => {
    const rows = await service.history();
    expect(rows).toEqual([]);
  });

  it('skips daily digest when the feature flag is off', async () => {
    const off = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        {
          provide: ConfigService,
          useValue: createMockConfig({ FEATURE_DIGEST: 'false' }),
        },
      ],
    }).compile();
    const disabled = off.get(DigestService);
    await expect(disabled.sendDaily()).resolves.toEqual({
      status: 'skipped',
      reason: 'disabled',
    });
  });

  it('skips daily digest when there is no undigested episode', async () => {
    prisma.series.findMany.mockResolvedValue([]);
    await expect(service.sendDaily()).resolves.toEqual({
      status: 'skipped',
      reason: 'no-episode',
    });
  });
});
