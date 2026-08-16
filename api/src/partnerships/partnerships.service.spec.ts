import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { PartnershipsService } from './partnerships.service';

describe('PartnershipsService', () => {
  let service: PartnershipsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const row = {
    id: 'inq-1',
    organization: 'Acme NGO',
    contactName: 'Jane Doe',
    email: 'jane@acme.org',
    phone: null,
    website: null,
    type: 'sponsor',
    budget: null,
    message: 'We want to partner',
    status: 'NEW' as const,
    notes: null,
    createdAt: new Date('2026-08-14T09:00:00.000Z'),
    updatedAt: new Date('2026-08-14T09:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      partnershipInquiry: {
        create: jest.fn().mockResolvedValue(row),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue({ ...row, status: 'CONTACTED' }),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnershipsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PartnershipsService);
  });

  it('ignores honeypot submissions', async () => {
    await expect(
      service.create({
        organization: 'Bot',
        contactName: 'Bot',
        email: 'bot@spam.test',
        type: 'spam',
        message: 'spam',
        honeypot: 'filled',
      }),
    ).resolves.toEqual({ ok: true });
    expect(prisma.partnershipInquiry.create).not.toHaveBeenCalled();
  });

  it('creates a partnership inquiry', async () => {
    const result = await service.create({
      organization: ' Acme NGO ',
      contactName: ' Jane Doe ',
      email: ' Jane@Acme.org ',
      type: 'sponsor',
      message: ' We want to partner ',
    });
    expect(result.email).toBe('jane@acme.org');
  });

  it('lists inquiries', async () => {
    const result = await service.list({ q: 'acme' });
    expect(result.items).toHaveLength(1);
  });

  it('gets inquiry by id', async () => {
    const result = await service.getById('inq-1');
    expect(result.organization).toBe('Acme NGO');
  });

  it('throws when inquiry is missing', async () => {
    prisma.partnershipInquiry.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates inquiry status', async () => {
    const result = await service.update('inq-1', { status: 'CONTACTED' });
    expect(result.status).toBe('CONTACTED');
  });
});
