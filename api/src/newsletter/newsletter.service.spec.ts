import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { NewsletterService } from './newsletter.service';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const row = {
    id: 'sub-1',
    email: 'reader@example.com',
    source: 'website',
    createdAt: new Date('2026-08-14T09:00:00.000Z'),
    updatedAt: new Date('2026-08-14T09:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      newsletterSubscriber: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(row),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row]),
        delete: jest.fn().mockResolvedValue(row),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NewsletterService);
  });

  it('subscribes a new email', async () => {
    const result = await service.subscribe({ email: ' Reader@Example.com ' });
    expect(result.email).toBe('reader@example.com');
  });

  it('rejects duplicate subscriptions', async () => {
    prisma.newsletterSubscriber.findUnique = jest.fn().mockResolvedValue(row);
    await expect(
      service.subscribe({ email: 'reader@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists subscribers with pagination', async () => {
    const result = await service.list({ page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('counts subscribers', async () => {
    await expect(service.count()).resolves.toEqual({ total: 1 });
  });

  it('removes a subscriber', async () => {
    prisma.newsletterSubscriber.findUnique = jest.fn().mockResolvedValue(row);
    await expect(service.remove('sub-1')).resolves.toEqual({ ok: true });
  });

  it('throws when removing a missing subscriber', async () => {
    prisma.newsletterSubscriber.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
