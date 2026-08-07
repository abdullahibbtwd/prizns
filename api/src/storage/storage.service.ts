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
    this.publicUrl =
      this.config.get<string>('MINIO_PUBLIC_URL') ??
      `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
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
    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to initialize MinIO bucket');
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

    await this.client.putObject(
      this.bucket,
      key,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    const url = `${this.publicUrl}/${this.bucket}/${key}`;

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
      url: record.url!,
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
