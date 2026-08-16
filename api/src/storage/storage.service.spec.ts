import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  resolvePublicMediaUrl,
  StorageService,
} from './storage.service';

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn(),
    setBucketPolicy: jest.fn(),
    listBuckets: jest.fn().mockResolvedValue([{ name: 'prizni' }]),
    putObject: jest.fn().mockResolvedValue(undefined),
    presignedGetObject: jest.fn().mockResolvedValue('https://signed.example/file'),
    removeObject: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('resolvePublicMediaUrl', () => {
  it('returns absolute urls unchanged', () => {
    const url = resolvePublicMediaUrl(
      { key: 'k', url: 'https://example.com/x.jpg' },
      (key) => `https://cdn/${key}`,
    );
    expect(url).toBe('https://example.com/x.jpg');
  });

  it('resolves minio keys via callback', () => {
    const url = resolvePublicMediaUrl(
      { key: 'uploads/a.jpg', url: '/media/uploads/a.jpg' },
      (key) => `https://cdn/${key}`,
    );
    expect(url).toBe('https://cdn/uploads/a.jpg');
  });
});

describe('StorageService', () => {
  let service: StorageService;
  let prisma: { fileObject: { create: jest.Mock; deleteMany: jest.Mock } };

  beforeEach(() => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: 9000,
          MINIO_BUCKET: 'prizni',
          MINIO_ACCESS_KEY: 'key',
          MINIO_SECRET_KEY: 'secret',
        };
        return values[key];
      }),
      get: jest.fn((key: string) => {
        if (key === 'MINIO_USE_SSL') return 'false';
        if (key === 'MINIO_PUBLIC_URL') return 'https://cdn.example';
        return undefined;
      }),
    } as unknown as ConfigService;

    prisma = {
      fileObject: {
        create: jest.fn().mockResolvedValue({
          id: 'file-1',
          key: 'uploads/x.txt',
          bucket: 'prizni',
          originalName: 'x.txt',
          mimeType: 'image/jpeg',
          size: 3,
          url: 'https://cdn.example/prizni/uploads/x.txt',
        }),
        deleteMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'file-1' }),
      },
    };

    service = new StorageService(config, prisma as unknown as PrismaService);
  });

  it('builds public url for key', () => {
    expect(service.publicUrlFor('uploads/a.jpg')).toBe(
      'https://cdn.example/prizni/uploads/a.jpg',
    );
  });

  it('uploads buffer and persists file object', async () => {
    const result = await service.uploadBuffer({
      buffer: Buffer.from('abc'),
      mimeType: 'image/jpeg',
      originalName: 'x.jpg',
    });
    expect(result.id).toBe('file-1');
    expect(prisma.fileObject.create).toHaveBeenCalled();
  });

  it('uploads multer files and resolves public urls', async () => {
    const uploaded = await service.upload({
      buffer: Buffer.from('image'),
      mimetype: 'image/jpeg',
      originalname: 'photo.jpg',
    } as Express.Multer.File);
    expect(uploaded.url).toContain('uploads/');
    expect(
      service.resolvePublicUrl({
        key: uploaded.key,
        url: `/media/${uploaded.key}`,
      }),
    ).toContain(uploaded.key);
  });

  it('returns presigned download urls', async () => {
    await expect(service.getPresignedUrl('uploads/a.jpg')).resolves.toBe(
      'https://signed.example/file',
    );
  });

  it('pings minio and removes stored objects', async () => {
    await expect(service.ping()).resolves.toBe(true);
    await service.remove('uploads/a.jpg');
    expect(prisma.fileObject.deleteMany).toHaveBeenCalledWith({
      where: { key: 'uploads/a.jpg' },
    });
  });
});
