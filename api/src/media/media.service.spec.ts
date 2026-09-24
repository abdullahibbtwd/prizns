import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MediaKind, MediaProcessStatus } from '@prisma/client';
import { mkdtemp, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { QUEUE_MEDIA } from '../jobs/queue.constants';
import { MediaService } from './media.service';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const storage = {
    upload: jest.fn(),
    uploadBuffer: jest.fn(),
    uploadFromPath: jest.fn(),
    publicUrlFor: jest.fn((key: string) => `https://cdn.example/${key}`),
    resolvePublicUrl: jest.fn((row: { url: string }) => row.url),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

  const row = {
    id: 'media-1',
    key: 'media/test.jpg',
    url: 'https://cdn.example/media/test.jpg',
    kind: MediaKind.IMAGE,
    status: MediaProcessStatus.DONE,
    error: null,
    originalName: 'test.jpg',
    mimeType: 'image/jpeg',
    size: 1000,
    originalSize: 1000,
    processedSize: 800,
    thumbnailKey: null,
    thumbnailUrl: null,
    width: 32,
    height: 24,
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
        findUnique: jest.fn().mockResolvedValue(row),
        create: jest.fn().mockResolvedValue({
          ...row,
          status: MediaProcessStatus.PENDING,
          url: '',
        }),
        update: jest.fn().mockResolvedValue(row),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue(row),
      },
      article: {
        count: jest.fn().mockResolvedValue(0),
      },
      articleGalleryItem: {
        count: jest.fn().mockResolvedValue(0),
      },
      series: {
        count: jest.fn().mockResolvedValue(0),
      },
      product: {
        count: jest.fn().mockResolvedValue(0),
      },
      productGalleryItem: {
        count: jest.fn().mockResolvedValue(0),
      },
      author: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    queue.add.mockClear();
    storage.uploadBuffer.mockReset().mockImplementation(async (input: { key?: string }) => ({
      key: input.key,
      url: `https://cdn.example/${input.key}`,
      size: 12,
    }));
    storage.uploadFromPath.mockReset().mockResolvedValue({
      key: 'cms/media-1.mp4',
      url: 'https://cdn.example/cms/media-1.mp4',
      size: 40,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: getQueueToken(QUEUE_MEDIA), useValue: queue },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('lists media assets', async () => {
    const items = await service.list({ kind: MediaKind.IMAGE });
    expect(items).toHaveLength(1);
    expect(prisma.mediaAsset.findMany).toHaveBeenCalled();
  });

  it('dedupes WordPress sized derivatives onto the original', () => {
    const deduped = service.dedupeSizeVariants([
      {
        ...service.toClient({
          ...row,
          id: 'thumb',
          originalName: 'photo-150x150.jpg',
          key: 'wp/photo-150x150.jpg',
          url: 'https://cdn.example/photo-150x150.jpg',
          size: 12_000,
        }),
      },
      {
        ...service.toClient({
          ...row,
          id: 'full',
          originalName: 'photo.jpg',
          key: 'wp/photo.jpg',
          url: 'https://cdn.example/photo.jpg',
          size: 400_000,
        }),
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.id).toBe('full');
  });

  it('lists public media without product or shop images', async () => {
    const items = await service.listPublic();
    expect(items[0]?.id).toBe('media-1');
    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: MediaProcessStatus.DONE,
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

  it('queues a validated image upload as pending', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-media-'));
    const path = join(dir, 'hero.jpg');
    try {
      await sharp({
        create: { width: 8, height: 8, channels: 3, background: 'red' },
      })
        .jpeg()
        .toFile(path);
      const { size } = await stat(path);

      const created = await service.createFromUpload({
        path,
        size,
        mimetype: 'image/jpeg',
        originalname: 'hero.jpg',
      } as Express.Multer.File);

      expect(created.status).toBe(MediaProcessStatus.PENDING);
      expect(queue.add).toHaveBeenCalledWith(
        'process',
        expect.objectContaining({ folder: 'cms' }),
        expect.objectContaining({
          jobId: expect.stringMatching(/^media:process:/),
          attempts: 3,
        }),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects a renamed executable pretending to be a jpeg', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-media-'));
    const path = join(dir, 'evil.jpg');
    try {
      await writeFile(path, Buffer.from('MZ not an image at all!!'));
      await expect(
        service.createFromUpload({
          path,
          size: 24,
          mimetype: 'image/jpeg',
          originalname: 'evil.jpg',
        } as Express.Multer.File),
      ).rejects.toThrow(/does not look like/i);
      expect(queue.add).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('processes an image job into webp derivatives', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-media-'));
    const path = join(dir, 'hero.jpg');
    try {
      await sharp({
        create: { width: 16, height: 16, channels: 3, background: 'green' },
      })
        .jpeg()
        .toFile(path);

      prisma.mediaAsset.findUnique = jest.fn().mockResolvedValue({
        ...row,
        status: MediaProcessStatus.PENDING,
      });

      await service.processJob({
        mediaId: 'media-1',
        tempPath: path,
        folder: 'cms',
        originalName: 'hero.jpg',
        mimeType: 'image/jpeg',
      });

      expect(storage.uploadBuffer).toHaveBeenCalledTimes(2);
      expect(prisma.mediaAsset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MediaProcessStatus.DONE,
            mimeType: 'image/webp',
            key: 'cms/media-1.webp',
          }),
        }),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('is idempotent when the record is already done', async () => {
    await service.processJob({
      mediaId: 'media-1',
      tempPath: '/tmp/missing-on-purpose.jpg',
      folder: 'cms',
      originalName: 'hero.jpg',
      mimeType: 'image/jpeg',
    });
    expect(storage.uploadBuffer).not.toHaveBeenCalled();
  });

  it('deletes a media row and its stored object', async () => {
    const result = await service.remove('media-1');
    expect(result).toEqual({ ok: true, id: 'media-1' });
    expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({
      where: { id: 'media-1' },
    });
    expect(storage.remove).toHaveBeenCalledWith('media/test.jpg');
  });

  it('treats unused media as an orphan', async () => {
    await expect(service.isOrphan('media-1')).resolves.toBe(true);
    prisma.article.count = jest.fn().mockResolvedValue(1);
    await expect(service.isOrphan('media-1')).resolves.toBe(false);
  });
});
