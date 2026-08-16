import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ArticlesService } from '../articles/articles.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const storage = { upload: jest.fn() };
  const articles = { create: jest.fn() };

  const row = {
    id: 'sub-1',
    name: 'Contributor',
    email: 'c@example.com',
    phone: null,
    place: 'Vidin',
    title: 'My story',
    category: 'Human Stories',
    description: 'Desc',
    story: 'Story text',
    links: null,
    ownWork: true,
    status: SubmissionStatus.NEW,
    notes: null,
    articleId: null,
    photoUrls: [],
    documentUrls: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      submission: {
        create: jest.fn().mockResolvedValue(row),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
        delete: jest.fn().mockResolvedValue(row),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: ArticlesService, useValue: articles },
      ],
    }).compile();

    service = module.get(SubmissionsService);
  });

  it('creates submission', async () => {
    const created = await service.create({
      name: 'Contributor',
      email: 'c@example.com',
      place: 'Vidin',
      title: 'My story',
      category: 'Human Stories',
      description: 'Short description',
      story: 'Story text',
      ownWork: true,
    });
    expect(created.id).toBe('sub-1');
  });

  it('lists submissions', async () => {
    const result = await service.list({ page: 1 });
    expect(result.items).toHaveLength(1);
  });

  it('throws when submission missing', async () => {
    prisma.submission.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
