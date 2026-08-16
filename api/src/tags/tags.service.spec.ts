import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GeocodeStatus, TagKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { TagsService } from './tags.service';
import { geocodeNominatim } from './geocode.util';

jest.mock('./geocode.util', () => ({
  geocodeNominatim: jest.fn().mockResolvedValue({ lat: 43.99, lng: 22.87 }),
}));

describe('TagsService', () => {
  let service: TagsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const translation = {
    bilingualFromSingle: jest.fn().mockResolvedValue({ bg: 'София', en: 'Sofia' }),
  };

  const tag = {
    id: 'tag-1',
    slug: 'sofia',
    kind: TagKind.LOCATION,
    nameBg: 'София',
    nameEn: 'Sofia',
    lat: 43.99,
    lng: 22.87,
    geocodeStatus: GeocodeStatus.ok,
    geocodedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      tag: {
        findMany: jest.fn().mockResolvedValue([tag]),
        findUnique: jest.fn().mockResolvedValue(tag),
        create: jest.fn().mockResolvedValue(tag),
        update: jest.fn().mockResolvedValue(tag),
        delete: jest.fn(),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TranslationService, useValue: translation },
      ],
    }).compile();

    service = module.get(TagsService);
  });

  it('lists public tags', async () => {
    const tags = await service.listPublic(undefined);
    expect(tags[0]?.slug).toBe('sofia');
  });

  it('throws for invalid tag kind', async () => {
    await expect(service.listPublic('invalid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('gets tag by id', async () => {
    const row = await service.getById('tag-1');
    expect(row.name).toBe('Sofia');
  });

  it('throws when tag missing', async () => {
    prisma.tag.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates tag with bilingual names', async () => {
    const created = await service.create({
      kind: TagKind.LOCATION,
      nameBg: 'София',
    });
    expect(created.slug).toBe('sofia');
    expect(translation.bilingualFromSingle).toHaveBeenCalled();
    expect(geocodeNominatim).toHaveBeenCalled();
  });

  it('lists map pins for located tags', async () => {
    prisma.tag.findMany.mockResolvedValue([
      { ...tag, articleTags: [{ articleId: 'a1' }, { articleId: 'a2' }] },
    ]);
    const pins = await service.listMapPins();
    expect(pins).toEqual([
      expect.objectContaining({
        slug: 'sofia',
        lat: 43.99,
        lng: 22.87,
        storyCount: 2,
      }),
    ]);
  });
});
