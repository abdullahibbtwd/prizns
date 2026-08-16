import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const row = {
    id: 'cat-1',
    slug: 'vidin',
    nameBg: 'Видин',
    nameEn: 'Vidin',
    descriptionBg: null,
    descriptionEn: null,
    parentId: null,
    translationStatus: 'READY',
    translationError: null,
    sourceLang: 'bg',
    createdAt: new Date(),
    updatedAt: new Date(),
    parent: null,
    _count: { children: 0, articleCategories: 2 },
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      category: {
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        create: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
        delete: jest.fn(),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('lists categories', async () => {
    const items = await service.list();
    expect(items[0]?.slug).toBe('vidin');
    expect(items[0]?.articleCount).toBe(2);
  });

  it('creates a category', async () => {
    prisma.category.findUnique = jest.fn().mockResolvedValue(null);
    const created = await service.create({ nameBg: 'Видин' });
    expect(created.slug).toBe('vidin');
    expect(prisma.category.create).toHaveBeenCalled();
  });

  it('rejects a missing parent', async () => {
    prisma.category.findUnique = jest.fn().mockResolvedValue(null);
    await expect(
      service.create({ nameBg: 'News', parentId: 'missing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when category is missing', async () => {
    prisma.category.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('blocks deleting a parent with children', async () => {
    prisma.category.findUnique = jest.fn().mockResolvedValue({
      id: 'cat-1',
      _count: { children: 2 },
    });
    await expect(service.remove('cat-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
