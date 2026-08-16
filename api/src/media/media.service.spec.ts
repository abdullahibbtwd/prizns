import { Test, TestingModule } from '@nestjs/testing';
import { MediaKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { MediaService } from './media.service';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const storage = {
    upload: jest.fn(),
    resolvePublicUrl: jest.fn((row: { url: string }) => row.url),
  };

  const row = {
    id: 'media-1',
    key: 'media/test.jpg',
    url: 'https://cdn.example/media/test.jpg',
    kind: MediaKind.IMAGE,
    originalName: 'test.jpg',
    mimeType: 'image/jpeg',
    size: 1000,
    titleBg: null,
    titleEn: null,
    locationBg: null,
    locationEn: null,
    creditBg: null,
    creditEn: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      mediaAsset: {
        findMany: jest.fn().mockResolvedValue([row]),
        create: jest.fn().mockResolvedValue(row),
      },
      author: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('lists media assets', async () => {
    const items = await service.list({ kind: MediaKind.IMAGE });
    expect(items).toHaveLength(1);
    expect(prisma.mediaAsset.findMany).toHaveBeenCalled();
  });

  it('lists public media without product or shop images', async () => {
    const items = await service.listPublic();
    expect(items[0]?.id).toBe('media-1');
    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          products: { none: {} },
          productGalleryItems: { none: {} },
          NOT: { key: { startsWith: 'shop/' } },
        }),
      }),
    );
  });

  it('omits author and profile portrait images from the public gallery', async () => {
    prisma.mediaAsset.findMany = jest.fn().mockResolvedValue([
      { ...row, id: 'gallery', key: 'cms/river.jpg', url: 'https://cdn.example/cms/river.jpg' },
      { ...row, id: 'portrait', key: 'cms/face.jpg', url: 'https://cdn.example/cms/face.jpg' },
    ]);
    prisma.author.findMany = jest.fn().mockResolvedValue([
      { imageUrl: 'https://cdn.example/cms/face.jpg' },
    ]);
    prisma.user.findMany = jest.fn().mockResolvedValue([]);

    const items = await service.listPublic();
    expect(items.map((item) => item.id)).toEqual(['gallery']);
  });

  it('creates from upload', async () => {
    storage.upload.mockResolvedValue({
      key: 'media/new.jpg',
      url: 'https://cdn.example/media/new.jpg',
      mimeType: 'image/jpeg',
      originalName: 'new.jpg',
      size: 500,
    });
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/jpeg',
      originalname: 'new.jpg',
    } as Express.Multer.File;

    const created = await service.createFromUpload(file);
    expect(created.id).toBe('media-1');
    expect(storage.upload).toHaveBeenCalledWith(file, 'media');
  });
});
