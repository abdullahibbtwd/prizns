import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';
import { createMockPrisma } from '../../test/helpers/mocks';

describe('DashboardController', () => {
  let controller: DashboardController;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma({
      article: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn() },
      author: { findMany: jest.fn().mockResolvedValue([]) },
      submission: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn() },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
      category: { findMany: jest.fn().mockResolvedValue([]) },
    });

    const builder = Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(DashboardController);
  });

  const admin = { id: 'u-admin', role: 'ADMIN', roles: ['ADMIN'] } as never;
  const author = { id: 'u-author', role: 'AUTHOR', roles: ['AUTHOR'] } as never;

  it('returns empty search for short queries', async () => {
    await expect(controller.search('a', admin)).resolves.toEqual({
      q: 'a',
      stories: [],
      authors: [],
      submissions: [],
      tags: [],
      categories: [],
    });
  });

  it('searches when query is long enough', async () => {
    await controller.search('vidin', admin);
    expect(prisma.article.findMany).toHaveBeenCalled();
    expect(prisma.author.findMany).toHaveBeenCalled();
    expect(prisma.submission.findMany).toHaveBeenCalled();
  });

  it('limits an author search to their own stories and hides submissions', async () => {
    prisma.author.findUnique = jest.fn().mockResolvedValue({ id: 'author-1' });
    const result = await controller.search('vidin', author);
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorId: 'author-1' }),
      }),
    );
    expect(prisma.submission.findMany).not.toHaveBeenCalled();
    expect(result.submissions).toEqual([]);
  });

  it('returns checklist counts', async () => {
    prisma.submission.count = jest.fn().mockResolvedValue(1);
    prisma.article.count = jest.fn().mockResolvedValue(2);
    const result = await controller.checklist(admin);
    expect(result).toHaveProperty('pendingSubmissions', 1);
    expect(result).toHaveProperty('reviewArticles', 2);
  });

  it('lists submitted stories in the review queue for publishers', async () => {
    prisma.submission.count = jest.fn().mockResolvedValue(0);
    prisma.article.count = jest.fn().mockResolvedValue(1);
    const submittedAt = new Date('2026-09-28T10:00:00Z');
    prisma.article.findMany = jest.fn().mockResolvedValue([
      {
        id: 'art-1',
        titleBg: 'Заглавие',
        titleEn: 'Title',
        submittedForReviewAt: submittedAt,
        updatedAt: new Date(),
        author: { nameBg: 'Мария', nameEn: 'Maria' },
      },
    ]);
    const result = await controller.checklist(admin);
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'REVIEW' } }),
    );
    expect(result.reviewQueue).toEqual([
      {
        id: 'art-1',
        titleBg: 'Заглавие',
        titleEn: 'Title',
        authorBg: 'Мария',
        authorEn: 'Maria',
        submittedAt,
      },
    ]);
    expect(result.changesRequested).toEqual([]);
  });

  it('scopes an author checklist and shows their sent-back stories', async () => {
    prisma.author.findUnique = jest.fn().mockResolvedValue({ id: 'author-1' });
    prisma.submission.count = jest.fn();
    prisma.article.count = jest.fn().mockResolvedValue(0);
    prisma.article.findMany = jest.fn().mockResolvedValue([
      {
        id: 'art-2',
        titleBg: 'Моя',
        titleEn: null,
        reviewNote: 'Please add a photo credit',
        reviewNoteAt: new Date(),
      },
    ]);
    const result = await controller.checklist(author);
    expect(prisma.submission.count).not.toHaveBeenCalled();
    expect(result.pendingSubmissions).toBe(0);
    expect(prisma.article.count).toHaveBeenCalledWith({
      where: { authorId: 'author-1', status: 'REVIEW' },
    });
    expect(result.reviewQueue).toEqual([]);
    expect(result.changesRequested).toHaveLength(1);
    expect(result.changesRequested[0].reviewNote).toBe(
      'Please add a photo credit',
    );
  });
});
