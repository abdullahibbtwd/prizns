import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { BadgesService } from '../badges/badges.service';
import { DigestService } from '../digest/digest.service';
import { AiService } from '../ai/ai.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { buildArticleRow } from '../../test/helpers/factories';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const storage = {
    publicUrlFor: jest.fn((key: string) => `https://cdn/${key}`),
  };
  const badges = { evaluateAuthor: jest.fn().mockResolvedValue({ awarded: [] }) };
  const digest = {
    trySendForPublishedArticle: jest.fn().mockResolvedValue(undefined),
  };
  const ai = { enqueueEmbed: jest.fn().mockResolvedValue(undefined) };

  let article: ReturnType<typeof buildArticleRow>;
  let lastCreated: ReturnType<typeof buildArticleRow>;

  beforeEach(async () => {
    article = buildArticleRow();
    lastCreated = article;
    prisma = createMockPrisma({
      article: {
        findMany: jest.fn().mockResolvedValue([article]),
        findFirst: jest.fn().mockResolvedValue(article),
        findUnique: jest.fn().mockImplementation(async (args) => {
          const where = args.where as { id?: string; section_slug?: unknown };
          if (where.section_slug) return null;
          if (where.id === 'art-new') return lastCreated;
          if (where.id) return { ...article, id: where.id };
          return article;
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(article),
        create: jest.fn().mockImplementation(async ({ data }) => {
          lastCreated = { ...article, ...data, id: 'art-new' };
          return lastCreated;
        }),
        update: jest.fn().mockImplementation(async ({ data }) => ({
          ...article,
          ...data,
        })),
        delete: jest.fn().mockResolvedValue(article),
        count: jest.fn().mockResolvedValue(1),
      },
      articleReaction: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(3),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'react-1' }),
      },
      articleTag: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      articleGalleryItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      seriesEpisode: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(async (arg: unknown) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        return arg;
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: BadgesService, useValue: badges },
        { provide: DigestService, useValue: digest },
        { provide: AiService, useValue: ai },
      ],
    }).compile();

    service = module.get(ArticlesService);
  });

  it('lists public articles', async () => {
    const items = await service.listPublic('stories');
    expect(items).toHaveLength(1);
    expect(items[0]?.titleBg).toBe('История');
  });

  it('gets public article by section and slug', async () => {
    const row = await service.getPublicBySectionSlug(
      'stories',
      'test-story',
      'visitor-key',
    );
    expect(row.slug).toBe('test-story');
    expect(row.relateCount).toBe(3);
  });

  it('throws when public article is missing', async () => {
    prisma.article.findFirst = jest.fn().mockResolvedValue(null);
    await expect(
      service.getPublicBySectionSlug('stories', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps sourced onto the public article dto', async () => {
    article.sourced = true;
    prisma.article.findFirst = jest.fn().mockResolvedValue(article);
    const dto = await service.getPublicBySectionSlug('stories', 'test-story');
    expect(dto.sourced).toBe(true);
  });

  it('creates a draft article', async () => {
    const created = await service.create({
      section: 'places',
      categoryBg: 'Places',
      titleBg: 'New Place Story',
      body: [{ type: 'paragraph', text: 'Hello' }],
    });
    expect(created.titleBg).toBe('New Place Story');
    expect(ai.enqueueEmbed).not.toHaveBeenCalled();
  });

  it('creates a published article and queues embed', async () => {
    prisma.article.create = jest.fn().mockResolvedValue({
      ...article,
      id: 'art-pub',
      status: ArticleStatus.PUBLISHED,
    });

    await service.create({
      section: 'places',
      categoryBg: 'Places',
      titleBg: 'Published',
      status: ArticleStatus.PUBLISHED,
    });
    expect(digest.trySendForPublishedArticle).toHaveBeenCalled();
    expect(ai.enqueueEmbed).toHaveBeenCalledWith('art-pub');
  });

  it('stores the chosen datetime for a scheduled article', async () => {
    const when = '2026-09-01T10:00:00.000Z';
    await service.create({
      section: 'places',
      categoryBg: 'Places',
      titleBg: 'Later',
      status: ArticleStatus.SCHEDULED,
      publishedAt: when,
    });
    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ArticleStatus.SCHEDULED,
          publishedAt: new Date(when),
        }),
      }),
    );
  });

  it('publishes a future scheduled story immediately when asked', async () => {
    const future = new Date('2099-01-01T10:00:00.000Z');
    article.status = ArticleStatus.SCHEDULED;
    article.publishedAt = future;

    await service.update('art-1', { status: ArticleStatus.PUBLISHED });

    const data = (prisma.article.update as jest.Mock).mock.calls[0][0].data as {
      status: ArticleStatus;
      publishedAt: Date;
    };
    expect(data.status).toBe(ArticleStatus.PUBLISHED);
    expect(data.publishedAt.getTime()).toBeLessThan(future.getTime());
    expect(data.publishedAt.getTime()).toBeGreaterThan(Date.now() - 5_000);
  });

  it('publishes scheduled articles whose time has come', async () => {
    const due = {
      ...article,
      id: 'art-due',
      status: ArticleStatus.SCHEDULED,
      publishedAt: new Date('2020-01-01T00:00:00.000Z'),
    };
    prisma.article.findMany = jest.fn().mockResolvedValue([{ id: 'art-due' }]);
    prisma.article.findUnique = jest.fn().mockImplementation(async (args: {
      where: { id?: string; section_slug?: unknown };
      include?: unknown;
    }) => {
      const where = args.where;
      if (where.section_slug) return null;
      if (where.id === 'art-due') {
        return args.include
          ? { ...due, status: ArticleStatus.PUBLISHED }
          : due;
      }
      return article;
    });

    const result = await service.publishDueScheduled(
      new Date('2026-08-15T12:00:00.000Z'),
    );
    expect(result.published).toBe(1);
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-due' },
        data: expect.objectContaining({ status: ArticleStatus.PUBLISHED }),
      }),
    );
  });

  it('updates an article title', async () => {
    prisma.article.findUnique = jest.fn().mockImplementation(async (args) => {
      const where = args.where as { id?: string; section_slug?: unknown };
      if (where.section_slug) return null;
      if (where.id) {
        if (args.include) {
          return { ...article, id: where.id, titleBg: 'Updated title' };
        }
        return { ...article, id: where.id };
      }
      return article;
    });
    const updated = await service.update('art-1', { titleBg: 'Updated title' });
    expect(updated.titleBg).toBe('Updated title');
  });

  it('lists cms articles with pagination', async () => {
    const result = await service.listCms({ page: 1, pageSize: 9 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('gets cms article by id', async () => {
    const row = await service.getCmsById('art-1');
    expect(row.id).toBe('art-1');
  });

  it('adds relate reaction idempotently', async () => {
    const first = await service.addRelate('stories', 'test-story', 'visitor-1');
    expect(first.relateCount).toBeGreaterThanOrEqual(0);

    prisma.articleReaction.findUnique = jest.fn().mockResolvedValue({ id: 'r1' });
    const second = await service.addRelate('stories', 'test-story', 'visitor-1');
    expect(second.viewerHasRelated).toBe(true);
  });

  it('lists related by tags when no embedding', async () => {
    const related = await service.listRelated('stories', 'test-story', 3);
    expect(Array.isArray(related)).toBe(true);
  });

  it('removes article', async () => {
    await expect(service.remove('art-1')).resolves.toEqual({
      ok: true,
      id: 'art-1',
    });
  });
});
