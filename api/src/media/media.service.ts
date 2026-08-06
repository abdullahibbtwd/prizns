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

  list(opts?: { kind?: MediaKind; take?: number }) {
    return this.prisma.mediaAsset.findMany({
      where: opts?.kind ? { kind: opts.kind } : undefined,
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 100,
    });
  }

  listPublic(opts?: { kind?: MediaKind; take?: number }) {
    return this.prisma.mediaAsset.findMany({
      where: { kind: opts?.kind ?? MediaKind.IMAGE },
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 60,
      select: {
        id: true,
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
    });
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

    return this.prisma.mediaAsset.create({
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
  }

  private detectKind(mime: string): MediaKind {
    if (mime.startsWith('audio/')) return MediaKind.AUDIO;
    if (mime.startsWith('video/')) return MediaKind.VIDEO;
    return MediaKind.IMAGE;
  }
}
