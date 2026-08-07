import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ArticleStatus,
  MediaKind,
  Prisma,
  Submission,
  SubmissionStatus,
} from '@prisma/client';
import { ArticlesService } from '../articles/articles.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

const CATEGORY_TO_SECTION: Record<string, string> = {
  'Human Stories': 'human-stories',
  Places: 'places',
  Traditions: 'traditions',
  Events: 'events',
  Culture: 'discover',
  Photography: 'gallery',
};

type Attachment = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  key?: string;
};

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly articles: ArticlesService,
  ) {}

  private parseAttachments(value: Prisma.JsonValue): Attachment[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is Attachment =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as Attachment).url === 'string',
    );
  }

  private toDto(row: Submission) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      place: row.place,
      village: row.place,
      title: row.title,
      category: row.category,
      description: row.description,
      story: row.story,
      links: row.links,
      ownWork: row.ownWork,
      status: row.status.toLowerCase() as
        | 'new'
        | 'review'
        | 'changes'
        | 'approved'
        | 'rejected',
      notes: row.notes,
      articleId: row.articleId,
      photoUrls: this.parseAttachments(row.photoUrls),
      documentUrls: this.parseAttachments(row.documentUrls),
      image: this.parseAttachments(row.photoUrls)[0]?.url ?? '/village.jpg',
      submittedAt: row.createdAt.toISOString().slice(0, 10),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async uploadMany(
    files: Express.Multer.File[] | undefined,
    folder: string,
  ): Promise<Attachment[]> {
    if (!files?.length) return [];
    const uploaded: Attachment[] = [];
    for (const file of files) {
      const result = await this.storage.upload(file, folder);
      uploaded.push({
        key: result.key,
        url: result.url,
        name: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
      });
    }
    return uploaded;
  }

  private detectKind(mime: string): MediaKind {
    if (mime.startsWith('audio/')) return MediaKind.AUDIO;
    if (mime.startsWith('video/')) return MediaKind.VIDEO;
    return MediaKind.IMAGE;
  }

  /** Resolve MinIO key for an attachment (stored key, or FileObject lookup by URL). */
  private async resolveAttachmentKey(photo: Attachment): Promise<string | null> {
    if (photo.key?.trim()) return photo.key.trim();

    const byUrl = await this.prisma.fileObject.findFirst({
      where: { url: photo.url },
      select: { key: true },
    });
    if (byUrl?.key) return byUrl.key;

    // Fallback: public URL often ends with /submissions/...
    const marker = '/submissions/';
    const idx = photo.url.indexOf(marker);
    if (idx >= 0) return photo.url.slice(idx + 1);

    return null;
  }

  /** Turn submission photos into CMS MediaAsset ids (reuse by key if already present). */
  private async mediaIdsFromPhotos(
    photos: Attachment[],
    creditBg?: string,
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const photo of photos) {
      if (photo.mimeType && !photo.mimeType.startsWith('image/')) continue;

      const key = await this.resolveAttachmentKey(photo);
      if (!key) continue;

      const existing = await this.prisma.mediaAsset.findUnique({
        where: { key },
        select: { id: true },
      });
      if (existing) {
        ids.push(existing.id);
        continue;
      }

      const created = await this.prisma.mediaAsset.create({
        data: {
          key,
          url: this.storage.publicUrlFor(key),
          mimeType: photo.mimeType || 'image/jpeg',
          kind: this.detectKind(photo.mimeType || 'image/jpeg'),
          originalName: photo.name || null,
          size: photo.size || null,
          creditBg: creditBg?.trim() || null,
        },
        select: { id: true },
      });
      ids.push(created.id);
    }

    return ids;
  }

  async create(
    dto: CreateSubmissionDto,
    files?: {
      photos?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    if (!dto.ownWork) {
      throw new BadRequestException('You must confirm this is your own work');
    }

    const photoUrls = await this.uploadMany(files?.photos, 'submissions/photos');
    const documentUrls = await this.uploadMany(
      files?.documents,
      'submissions/documents',
    );

    const row = await this.prisma.submission.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        place: dto.place.trim(),
        title: dto.title.trim(),
        category: dto.category.trim(),
        description: dto.description.trim(),
        story: dto.story.trim(),
        links: dto.links?.trim() || null,
        ownWork: dto.ownWork,
        photoUrls: photoUrls as unknown as Prisma.InputJsonValue,
        documentUrls: documentUrls as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toDto(row);
  }

  async list(filters: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: SubmissionStatus;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));

    const where: Prisma.SubmissionWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { place: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.submission.count({ where }),
      this.prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getById(id: string) {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Submission not found');
    return this.toDto(row);
  }

  async update(id: string, dto: UpdateSubmissionDto) {
    await this.getById(id);
    const row = await this.prisma.submission.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
    });
    return this.toDto(row);
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.submission.delete({ where: { id } });
    return { ok: true };
  }

  async convertToDraft(id: string) {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Submission not found');

    if (row.articleId) {
      return {
        submission: this.toDto(row),
        articleId: row.articleId,
      };
    }

    const section = CATEGORY_TO_SECTION[row.category] ?? 'human-stories';
    const paragraphs = row.story
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((text) => ({
        type: 'paragraph' as const,
        text,
        textBg: text,
      }));

    if (row.description.trim()) {
      paragraphs.unshift({
        type: 'paragraph' as const,
        text: row.description.trim(),
        textBg: row.description.trim(),
      });
    }

    const photos = this.parseAttachments(row.photoUrls);
    const galleryMediaIds = await this.mediaIdsFromPhotos(photos, row.name);

    const article = await this.articles.create({
      section,
      status: ArticleStatus.DRAFT,
      categoryBg: row.category,
      titleBg: row.title,
      subtitleBg: row.description.slice(0, 240),
      locationBg: row.place,
      photoCreditBg: row.name,
      heroMediaId: galleryMediaIds[0],
      galleryMediaIds,
      body: paragraphs.length
        ? paragraphs
        : [{ type: 'paragraph', text: row.story, textBg: row.story }],
    });

    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.APPROVED,
        articleId: article.id,
      },
    });

    return {
      submission: this.toDto(updated),
      articleId: article.id,
    };
  }
}
