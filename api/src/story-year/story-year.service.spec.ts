import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StoryYearCampaignStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { StoryYearService } from './story-year.service';

describe('StoryYearService', () => {
  let service: StoryYearService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const campaign = {
    id: 'camp-1',
    year: 2026,
    titleBg: 'История на годината',
    titleEn: 'Story of the Year',
    descriptionBg: '',
    descriptionEn: null,
    status: StoryYearCampaignStatus.DRAFT,
    opensAt: null,
    closesAt: null,
    nominations: [],
    _count: { nominations: 0, votes: 0 },
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      storyYearCampaign: {
        findMany: jest.fn().mockResolvedValue([campaign]),
        findUnique: jest.fn().mockResolvedValue(campaign),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(campaign),
        update: jest.fn().mockResolvedValue(campaign),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryYearService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StoryYearService);
  });

  it('lists cms campaigns', async () => {
    const rows = await service.listCms();
    expect(rows).toHaveLength(1);
  });

  it('gets cms campaign by id', async () => {
    const row = await service.getCms('camp-1');
    expect(row.id).toBe('camp-1');
  });

  it('throws when campaign missing', async () => {
    prisma.storyYearCampaign.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getCms('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates campaign', async () => {
    const created = await service.create({
      year: 2026,
      titleBg: 'История на годината',
    });
    expect(created.year).toBe(2026);
  });
});
