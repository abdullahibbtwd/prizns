import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { AuthorsService } from './authors.service';

describe('AuthorsService', () => {
  let service: AuthorsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const badges = {
    badgesForAuthor: jest.fn().mockResolvedValue([]),
    evaluateAuthor: jest.fn().mockResolvedValue({ awarded: [] }),
  };

  const author = {
    id: 'author-1',
    slug: 'ivan-petrov',
    nameBg: 'Иван Петров',
    nameEn: 'Ivan Petrov',
    roleBg: 'Journalist',
    roleEn: null,
    locationBg: 'Vidin',
    locationEn: null,
    quoteBg: null,
    quoteEn: null,
    bioBg: null,
    bioEn: null,
    imageUrl: null,
    aliases: [],
    isActive: true,
    translationStatus: 'DONE',
    translationError: null,
    sourceLang: 'bg',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { articles: 3 },
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      author: {
        findMany: jest.fn().mockResolvedValue([author]),
        findFirst: jest.fn().mockResolvedValue(author),
        findUnique: jest.fn().mockResolvedValue(author),
        create: jest.fn().mockResolvedValue(author),
        update: jest.fn().mockResolvedValue(author),
        delete: jest.fn().mockResolvedValue(author),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BadgesService, useValue: badges },
      ],
    }).compile();

    service = module.get(AuthorsService);
  });

  it('lists active authors', async () => {
    const rows = await service.listActive();
    expect(rows).toHaveLength(1);
    expect(prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });

  it('lists cms authors that belong to AUTHOR-role users', async () => {
    await service.listCms();
    expect(prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { user: { is: { role: 'AUTHOR' } } },
            { userId: null },
          ],
        },
      }),
    );
  });

  it('lists public authors with badges', async () => {
    const rows = await service.listPublic();
    expect(rows[0]?.slug).toBe('ivan-petrov');
    expect(badges.badgesForAuthor).toHaveBeenCalled();
  });

  it('gets public author by slug', async () => {
    const row = await service.getPublicBySlug('ivan-petrov');
    expect(row?.slug).toBe('ivan-petrov');
  });

  it('throws when cms author missing', async () => {
    prisma.author.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes an author', async () => {
    await expect(service.remove('author-1')).resolves.toEqual({
      ok: true,
      id: 'author-1',
    });
    expect(prisma.author.delete).toHaveBeenCalledWith({
      where: { id: 'author-1' },
    });
  });
});
