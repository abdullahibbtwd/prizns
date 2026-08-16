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

  it('returns empty search for short queries', async () => {
    await expect(controller.search('a')).resolves.toEqual({
      q: 'a',
      stories: [],
      authors: [],
      submissions: [],
      tags: [],
      categories: [],
    });
  });

  it('searches when query is long enough', async () => {
    await controller.search('vidin');
    expect(prisma.article.findMany).toHaveBeenCalled();
    expect(prisma.author.findMany).toHaveBeenCalled();
  });

  it('returns checklist counts', async () => {
    prisma.submission.count = jest.fn().mockResolvedValue(1);
    prisma.article.count = jest.fn().mockResolvedValue(2);
    const result = await controller.checklist();
    expect(result).toHaveProperty('pendingSubmissions', 1);
    expect(result).toHaveProperty('reviewArticles', 2);
  });
});
