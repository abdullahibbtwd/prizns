import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';
import { PrismaService } from '../prisma/prisma.service';

export type UploadedFile = {
  id: string;
  key: string;
  bucket: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

/** Pure helper — keeps URL resolution typed even when class method lookup fails. */
export function resolvePublicMediaUrl(
  media: { key: string; url: string },
  publicUrlForKey: (key: string) => string,
): string {
  const url = media.url?.trim() ?? '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    (url.startsWith('/') && !url.startsWith('/media'))
  ) {
    return url;
  }
  return publicUrlForKey(media.key);
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const endPoint = this.config.getOrThrow<string>('MINIO_ENDPOINT');
    const port = this.config.getOrThrow<number>('MINIO_PORT');
    const useSSL = this.config.get<string>('MINIO_USE_SSL') === 'true';

    this.bucket = this.config.getOrThrow<string>('MINIO_BUCKET');
    // Browser-facing base. Prefer a public host/path (e.g. /media via nginx),
    // never the Docker-internal `minio:9000` hostname.
    this.publicUrl = (
      this.config.get<string>('MINIO_PUBLIC_URL') ??
      `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`
    ).replace(/\/$/, '');

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  /** Always rebuild browser URLs from key + current MINIO_PUBLIC_URL. */
  publicUrlFor(key: string, bucket = this.bucket): string {
    return `${this.publicUrl}/${bucket}/${key}`;
  }

  /**
   * Resolve a MediaAsset for the browser.
   * Seed rows store site-root paths like `/village.jpg` (served by the web app).
   * CMS uploads store MinIO keys and are exposed via MINIO_PUBLIC_URL (/media/...).
   */
  resolvePublicUrl(media: { key: string; url: string }): string {
    return resolvePublicMediaUrl(media, (key) => this.publicUrlFor(key));
  }

  async onModuleInit() {
    await this.ensureBucketWithRetry();
  }

  private async ensureBucketWithRetry(attempts = 12, delayMs = 2500) {
    let lastError: unknown;
    for (let i = 1; i <= attempts; i++) {
      try {
        await this.ensureBucket();
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `MinIO not ready (attempt ${i}/${attempts}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    // Do not crash the API — media uploads will fail until MinIO is reachable.
    this.logger.error(
      `MinIO still unreachable after ${attempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }. Check MINIO_PORT (host API → published port, usually 9010; in-compose → 9000).`,
    );
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
      this.logger.log(`Created MinIO bucket: ${this.bucket}`);
    } else {
      this.logger.log(`MinIO bucket ready: ${this.bucket}`);
    }

    // Public read for uploaded assets (replaces former minio-init mc policy)
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.listBuckets();
      return true;
    } catch {
      return false;
    }
  }

  async upload(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<UploadedFile> {
    if (!file) {
      throw new ServiceUnavailableException('No file provided');
    }

    const ext = file.originalname.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const url = this.publicUrlFor(key);

    const record = await this.prisma.fileObject.create({
      data: {
        key,
        bucket: this.bucket,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
      },
    });

    return {
      id: record.id,
      key: record.key,
      bucket: record.bucket,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      url: this.publicUrlFor(record.key, record.bucket),
    };
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async remove(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
    await this.prisma.fileObject.deleteMany({ where: { key } });
  }
}
