import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { ReaderService } from './reader.service';

describe('ReaderService', () => {
  let service: ReaderService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const publishedArticle = {
    id: 'article-1',
    section: 'human_stories' as const,
    slug: 'my-story',
    path: '/stories/my-story',
    status: ArticleStatus.PUBLISHED,
    titleBg: 'История',
    titleEn: 'Story',
    subtitleBg: null,
    subtitleEn: null,
    categoryBg: null,
    categoryEn: null,
    locationBg: null,
    locationEn: null,
    publishedAt: new Date('2026-08-01T00:00:00.000Z'),
    heroMedia: { url: 'https://cdn.example/hero.jpg' },
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      savedArticle: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'save-1',
            createdAt: new Date('2026-08-14T09:00:00.000Z'),
            article: publishedArticle,
          },
        ]),
        upsert: jest.fn().mockResolvedValue({ id: 'save-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'save-1' }),
      },
      article: {
        findFirst: jest.fn().mockResolvedValue({ id: 'article-1' }),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReaderService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: createMockConfig({ FEATURE_READER_AUTH: 'true' }),
        },
      ],
    }).compile();

    service = module.get(ReaderService);
  });

  it('lists published saves only', async () => {
    const saves = await service.listSaves('reader-1');
    expect(saves).toHaveLength(1);
    expect(saves[0]?.article.titleEn).toBe('Story');
  });

  it('throws when reader auth is disabled', async () => {
    const disabled = await Test.createTestingModule({
      providers: [
        ReaderService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: createMockConfig({ FEATURE_READER_AUTH: 'false' }),
        },
      ],
    }).compile();

    const disabledService = disabled.get(ReaderService);
    await expect(disabledService.listSaves('reader-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('saves a published article', async () => {
    const result = await service.saveArticle('reader-1', 'article-1');
    expect(result).toEqual({ ok: true, saved: true, id: 'save-1' });
  });

  it('throws when saving a missing article', async () => {
    prisma.article.findFirst = jest.fn().mockResolvedValue(null);
    await expect(
      service.saveArticle('reader-1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('unsaves an article', async () => {
    await expect(
      service.unsaveArticle('reader-1', 'article-1'),
    ).resolves.toEqual({ ok: true, saved: false });
  });

  it('reports saved status', async () => {
    await expect(
      service.isSaved('reader-1', 'article-1'),
    ).resolves.toEqual({ saved: true });
  });
});
