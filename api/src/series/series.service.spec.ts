import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { SeriesService } from './series.service';

describe('SeriesService', () => {
  let service: SeriesService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const storage = {
    publicUrlFor: jest.fn((key: string) => `https://cdn/${key}`),
    resolvePublicUrl: jest.fn((row: { url: string }) => row.url),
  };

  const series = {
    id: 'series-1',
    slug: 'village-tales',
    titleBg: 'Селски истории',
    titleEn: 'Village Tales',
    status: 'ACTIVE',
    coverMedia: { id: 'm1', key: 'cover.jpg', url: '/cover.jpg' },
    episodes: [],
    _count: { episodes: 0 },
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      series: {
        findMany: jest.fn().mockResolvedValue([series]),
        findFirst: jest.fn().mockResolvedValue(series),
        findUnique: jest.fn().mockResolvedValue(series),
        delete: jest.fn().mockResolvedValue(series),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(SeriesService);
  });

  it('lists series for cms', async () => {
    const rows = await service.list();
    expect(rows).toHaveLength(1);
  });

  it('lists public active series', async () => {
    prisma.series.findMany = jest.fn().mockResolvedValue([
      {
        ...series,
        episodes: [
          {
            sortOrder: 0,
            article: {
              id: 'a1',
              slug: 'ep-1',
              section: 'stories',
              path: '/stories/ep-1',
              status: ArticleStatus.PUBLISHED,
              titleBg: 'Ep 1',
              titleEn: null,
              categoryBg: 'Stories',
              heroMedia: null,
            },
          },
        ],
      },
    ]);
    const rows = await service.listPublic();
    expect(rows[0]?.slug).toBe('village-tales');
  });

  it('returns null for missing public slug', async () => {
    prisma.series.findFirst = jest.fn().mockResolvedValue(null);
    await expect(service.getPublicBySlug('missing')).resolves.toBeNull();
  });

  it('throws when cms series missing', async () => {
    prisma.series.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes a series', async () => {
    await expect(service.remove('series-1')).resolves.toEqual({
      ok: true,
      id: 'series-1',
    });
    expect(prisma.series.delete).toHaveBeenCalledWith({
      where: { id: 'series-1' },
    });
  });
});
