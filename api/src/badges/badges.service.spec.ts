import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { BadgesService } from './badges.service';

describe('BadgesService', () => {
  let service: BadgesService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const badge = {
    id: 'badge-1',
    slug: 'veteran',
    nameBg: 'Veteran',
    nameEn: 'Veteran',
    descriptionBg: null,
    descriptionEn: null,
    icon: null,
    isActive: true,
    minPublished: 5,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      badge: {
        findMany: jest.fn().mockResolvedValue([badge]),
        findUnique: jest.fn().mockResolvedValue(badge),
      },
      author: {
        findUnique: jest.fn().mockResolvedValue({ id: 'author-1' }),
      },
      article: {
        count: jest.fn().mockResolvedValue(6),
      },
      authorBadge: {
        findMany: jest.fn().mockResolvedValue([
          {
            awardedAt: new Date('2026-01-01T00:00:00.000Z'),
            source: 'auto',
            badge,
          },
        ]),
        upsert: jest.fn().mockResolvedValue({ badgeId: 'badge-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BadgesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(BadgesService);
  });

  it('lists active badges', async () => {
    const badges = await service.listBadges();
    expect(badges).toHaveLength(1);
  });

  it('returns badges for an author', async () => {
    const badges = await service.badgesForAuthor('author-1');
    expect(badges[0]?.slug).toBe('veteran');
  });

  it('evaluates and awards eligible badges', async () => {
    const result = await service.evaluateAuthor('author-1');
    expect(result.published).toBe(6);
    expect(result.awarded).toContain('badge-1');
  });

  it('returns empty awards when author is missing', async () => {
    prisma.author.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.evaluateAuthor('missing')).resolves.toEqual({
      awarded: [],
    });
  });

  it('awards a badge manually', async () => {
    await service.awardManual('author-1', 'badge-1');
    expect(prisma.authorBadge.upsert).toHaveBeenCalled();
  });

  it('throws when manual award targets missing author', async () => {
    prisma.author.findUnique = jest.fn().mockResolvedValue(null);
    await expect(
      service.awardManual('missing', 'badge-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revokes a badge', async () => {
    await expect(service.revoke('author-1', 'badge-1')).resolves.toEqual({
      ok: true,
    });
  });
});
