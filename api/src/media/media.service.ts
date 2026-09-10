import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { MediaKind, MediaProcessStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { open } from 'fs/promises';
import { QUEUE_MEDIA, type MediaJobData } from '../jobs/queue.constants';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { assertSniffMatchesKind } from '../common/file-sniff';
import {
  assertAllowedUploadMime,
  sanitizeStorageFolder,
} from '../common/upload-validation';
import { assertUploadSize, detectMediaKind } from '../common/upload-limits';
import {
  assertDecodableImage,
  processImageDerivatives,
} from './image-process';
import { unlinkQuietly } from './upload-temp';

export type MediaClientAsset = {
  id: string;
  key: string;
  url: string;
  mimeType: string;
  kind: MediaKind;
  status: MediaProcessStatus;
  error: string | null;
  originalName: string | null;
  size: number | null;
  originalSize: number | null;
  processedSize: number | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  titleBg: string | null;
  titleEn: string | null;
  locationBg: string | null;
  locationEn: string | null;
  creditBg: string | null;
  creditEn: string | null;
  createdAt: Date;
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(QUEUE_MEDIA) private readonly mediaQueue: Queue<MediaJobData>,
  ) {}

  async list(opts?: { kind?: MediaKind; take?: number }) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: opts?.kind ? { kind: opts.kind } : undefined,
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 100,
    });
    return rows.map((row) => this.toClient(row));
  }

  async getById(id: string) {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Media not found');
    return this.toClient(row);
  }

  async listPublic(opts?: { kind?: MediaKind; take?: number }) {
    const kind = opts?.kind ?? MediaKind.IMAGE;
    const take = opts?.take ?? 60;
    const isImage = kind === MediaKind.IMAGE;

    const [rows, authors, users] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where: {
          kind,
          status: MediaProcessStatus.DONE,
          ...(isImage
            ? {
                products: { none: {} },
                productGalleryItems: { none: {} },
                NOT: { key: { startsWith: 'shop/' } },
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: isImage ? take * 3 : take,
        select: {
          id: true,
          key: true,
          url: true,
          kind: true,
          status: true,
          error: true,
          mimeType: true,
          originalName: true,
          size: true,
          originalSize: true,
          processedSize: true,
          thumbnailKey: true,
          thumbnailUrl: true,
          width: true,
          height: true,
          titleBg: true,
          titleEn: true,
          locationBg: true,
          locationEn: true,
          creditBg: true,
          creditEn: true,
          createdAt: true,
        },
      }),
      isImage
        ? this.prisma.author.findMany({
            where: { imageUrl: { not: null } },
            select: { imageUrl: true },
          })
        : Promise.resolve([]),
      isImage
        ? this.prisma.user.findMany({
            where: { imageUrl: { not: null } },
            select: { imageUrl: true },
          })
        : Promise.resolve([]),
    ]);

    const portraits = this.portraitLookup(
      [...authors, ...users]
        .map((row) => row.imageUrl)
        .filter((url): url is string => Boolean(url?.trim())),
    );

    return rows
      .filter((row) => !this.isPortraitAsset(row, portraits))
      .slice(0, take)
      .map((row) => this.toClient(row));
  }

  /** URLs and storage keys used as author / CMS profile photos. */
  private portraitLookup(urls: string[]): Set<string> {
    const tokens = new Set<string>();
    for (const url of urls) {
      const trimmed = url.trim();
      if (!trimmed) continue;
      tokens.add(trimmed);
      const path = trimmed.includes('://')
        ? (() => {
            try {
              return new URL(trimmed).pathname;
            } catch {
              return trimmed;
            }
          })()
        : trimmed;
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 1) tokens.add(parts[parts.length - 1]!);
      if (parts.length >= 2) {
        tokens.add(`${parts[parts.length - 2]}/${parts[parts.length - 1]}`);
      }
    }
    return tokens;
  }

  private isPortraitAsset(
    row: { key: string; url: string },
    portraits: Set<string>,
  ): boolean {
    if (portraits.size === 0) return false;
    const resolved = this.storage.resolvePublicUrl(row);
    if (
      portraits.has(row.url) ||
      portraits.has(resolved) ||
      portraits.has(row.key)
    ) {
      return true;
    }
    const fileName = row.key.split('/').pop();
    return Boolean(fileName && portraits.has(fileName));
  }

  async createFromUpload(
    file: Express.Multer.File,
    opts?: {
      creditBg?: string;
      folder?: string;
      titleBg?: string;
      locationBg?: string;
      uploadedById?: string;
    },
  ) {
    const tempPath = file.path;
    if (!tempPath) {
      throw new BadRequestException('Upload temp file is missing');
    }

    const kind = detectMediaKind(file.mimetype);
    const size = file.size || 0;
    try {
      assertAllowedUploadMime(file.mimetype, 'cms');
      assertUploadSize(kind, size);
      await this.assertRealFile(tempPath, kind);
    } catch (error) {
      await unlinkQuietly(tempPath);
      throw error;
    }

    const folder = sanitizeStorageFolder(opts?.folder, 'cms');
    const created = await this.prisma.mediaAsset.create({
      data: {
        key: `pending/${randomUUID()}`,
        url: '',
        mimeType: file.mimetype,
        kind,
        status: MediaProcessStatus.PENDING,
        originalName: file.originalname,
        size,
        originalSize: size,
        tempPath,
        uploadedById: opts?.uploadedById ?? null,
        titleBg: opts?.titleBg?.trim() || null,
        locationBg: opts?.locationBg?.trim() || null,
        creditBg: opts?.creditBg?.trim() || null,
      },
    });

    try {
      await this.mediaQueue.add(
        'process',
        {
          mediaId: created.id,
          tempPath,
          folder,
          originalName: file.originalname,
          mimeType: file.mimetype,
        } satisfies MediaJobData,
        {
          jobId: `media:process:${created.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 4000 },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      await unlinkQuietly(tempPath);
      await this.markFailed(
        created.id,
        error instanceof Error ? error.message : 'Could not queue upload',
      );
      throw error;
    }

    this.logger.log(`Queued media job ${created.id} (${kind})`);
    return this.toClient(created);
  }

  async processJob(data: MediaJobData): Promise<void> {
    const row = await this.prisma.mediaAsset.findUnique({
      where: { id: data.mediaId },
    });
    if (!row) {
      await unlinkQuietly(data.tempPath);
      throw new Error(`Media record ${data.mediaId} is missing`);
    }

    if (row.status === MediaProcessStatus.DONE) {
      await unlinkQuietly(data.tempPath);
      return;
    }

    await this.prisma.mediaAsset.update({
      where: { id: row.id },
      data: { status: MediaProcessStatus.PROCESSING, error: null },
    });

    try {
      if (row.kind === MediaKind.IMAGE) {
        await this.processImageJob(row.id, data);
      } else {
        await this.processPassthroughJob(row.id, data);
      }
      await unlinkQuietly(data.tempPath);
    } catch (error) {
      // Keep the temp file so BullMQ retries can re-run the same job.
      throw error;
    }
  }

  async markFailed(mediaId: string, reason: string) {
    const row = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      select: { tempPath: true },
    });
    await unlinkQuietly(row?.tempPath);
    await this.prisma.mediaAsset.updateMany({
      where: { id: mediaId },
      data: {
        status: MediaProcessStatus.FAILED,
        error: reason.slice(0, 500),
        tempPath: null,
      },
    });
  }

  private async processImageJob(id: string, data: MediaJobData) {
    const derivatives = await processImageDerivatives(data.tempPath);
    const fullKey = `${data.folder}/${id}.webp`;
    const thumbKey = `${data.folder}/${id}-thumb.webp`;

    const uploaded = await this.storage.uploadBuffer({
      buffer: derivatives.full,
      mimeType: 'image/webp',
      originalName: `${id}.webp`,
      folder: data.folder,
      key: fullKey,
    });
    const thumb = await this.storage.uploadBuffer({
      buffer: derivatives.thumb,
      mimeType: 'image/webp',
      originalName: `${id}-thumb.webp`,
      folder: data.folder,
      key: thumbKey,
    });

    await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        status: MediaProcessStatus.DONE,
        key: fullKey,
        url: uploaded.url,
        mimeType: 'image/webp',
        size: derivatives.full.length,
        processedSize: derivatives.full.length,
        thumbnailKey: thumbKey,
        thumbnailUrl: thumb.url,
        width: derivatives.width,
        height: derivatives.height,
        tempPath: null,
        error: null,
      },
    });
  }

  private async processPassthroughJob(id: string, data: MediaJobData) {
    const ext = data.originalName.includes('.')
      ? data.originalName.slice(data.originalName.lastIndexOf('.'))
      : '';
    const key = `${data.folder}/${id}${ext}`;
    const uploaded = await this.storage.uploadFromPath({
      filePath: data.tempPath,
      mimeType: data.mimeType,
      originalName: data.originalName,
      folder: data.folder,
      key,
    });

    await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        status: MediaProcessStatus.DONE,
        key,
        url: uploaded.url,
        size: uploaded.size,
        processedSize: uploaded.size,
        tempPath: null,
        error: null,
      },
    });
  }

  private async assertRealFile(tempPath: string, kind: MediaKind) {
    const fh = await open(tempPath, 'r');
    try {
      const header = Buffer.alloc(16);
      const { bytesRead } = await fh.read(header, 0, 16, 0);
      assertSniffMatchesKind(header.subarray(0, bytesRead), kind);
    } finally {
      await fh.close();
    }
    if (kind === MediaKind.IMAGE) {
      await assertDecodableImage(tempPath);
    }
  }

  toClient(row: {
    id: string;
    key: string;
    url: string;
    mimeType: string;
    kind: MediaKind;
    status?: MediaProcessStatus;
    error?: string | null;
    originalName?: string | null;
    size?: number | null;
    originalSize?: number | null;
    processedSize?: number | null;
    thumbnailKey?: string | null;
    thumbnailUrl?: string | null;
    width?: number | null;
    height?: number | null;
    titleBg?: string | null;
    titleEn?: string | null;
    locationBg?: string | null;
    locationEn?: string | null;
    creditBg?: string | null;
    creditEn?: string | null;
    createdAt: Date;
  }): MediaClientAsset {
    const resolved = this.storage.resolvePublicUrl(row);
    const thumbnailUrl =
      row.thumbnailKey
        ? this.storage.publicUrlFor(row.thumbnailKey)
        : row.thumbnailUrl ?? null;
    return {
      id: row.id,
      key: row.key,
      url: resolved,
      mimeType: row.mimeType,
      kind: row.kind,
      status: row.status ?? MediaProcessStatus.DONE,
      error: row.error ?? null,
      originalName: row.originalName ?? null,
      size: row.size ?? null,
      originalSize: row.originalSize ?? null,
      processedSize: row.processedSize ?? null,
      thumbnailUrl,
      width: row.width ?? null,
      height: row.height ?? null,
      titleBg: row.titleBg ?? null,
      titleEn: row.titleEn ?? null,
      locationBg: row.locationBg ?? null,
      locationEn: row.locationEn ?? null,
      creditBg: row.creditBg ?? null,
      creditEn: row.creditEn ?? null,
      createdAt: row.createdAt,
    };
  }

  withPublicUrl<T extends { key: string; url: string }>(row: T): T {
    return { ...row, url: this.storage.resolvePublicUrl(row) };
  }
}
