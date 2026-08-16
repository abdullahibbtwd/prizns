import { Injectable } from '@nestjs/common';
import { MediaKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(opts?: { kind?: MediaKind; take?: number }) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: opts?.kind ? { kind: opts.kind } : undefined,
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 100,
    });
    return rows.map((row) => this.withPublicUrl(row));
  }

  async listPublic(opts?: { kind?: MediaKind; take?: number }) {
    const kind = opts?.kind ?? MediaKind.IMAGE;
    const take = opts?.take ?? 60;
    const isImage = kind === MediaKind.IMAGE;

    const [rows, authors, users] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where: {
          kind,
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
          originalName: true,
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
      .map((row) => this.withPublicUrl(row));
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
    },
  ) {
    const uploaded = await this.storage.upload(file, opts?.folder ?? 'media');
    const kind = this.detectKind(file.mimetype);
    const titleBg = opts?.titleBg?.trim() || null;
    const locationBg = opts?.locationBg?.trim() || null;

    const created = await this.prisma.mediaAsset.create({
      data: {
        key: uploaded.key,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        kind,
        originalName: uploaded.originalName,
        size: uploaded.size,
        titleBg,
        locationBg,
        creditBg: opts?.creditBg?.trim() || null,
      },
    });
    return this.withPublicUrl(created);
  }

  withPublicUrl<T extends { key: string; url: string }>(row: T): T {
    return { ...row, url: this.storage.resolvePublicUrl(row) };
  }

  private detectKind(mime: string): MediaKind {
    if (mime.startsWith('audio/')) return MediaKind.AUDIO;
    if (mime.startsWith('video/')) return MediaKind.VIDEO;
    return MediaKind.IMAGE;
  }
}
