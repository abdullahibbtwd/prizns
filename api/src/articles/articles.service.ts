import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Article,
  ArticleStatus,
  Author,
  MediaAsset,
  Prisma,
  Tag,
  TagKind,
  TranslationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicArticleDto, StoredArticleBlock } from './article.types';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import {
  buildArticlePath,
  toPrismaSection,
  toPrismaSectionFilter,
  toPublicSection,
} from './section.util';
import { ensureUniqueSlug } from '../common/slug.util';
import { StorageService } from '../storage/storage.service';

type GalleryMedia = {
  id: string;
  url: string;
  creditBg: string | null;
};

type SeriesEpisodeRel = {
  sortOrder: number;
  series: {
    id: string;
    slug: string;
    titleBg: string;
    titleEn: string | null;
  };
};

type ArticleTagRel = {
  tag: Tag;
};

type ArticleWithRelations = Article & {
  author: Author | null;
  heroMedia: MediaAsset | null;
  audioMedia: MediaAsset | null;
  videoMedia?: MediaAsset | null;
  galleryItems?: Array<{
    sortOrder: number;
    media: MediaAsset;
  }>;
  seriesEpisodes?: SeriesEpisodeRel[];
  articleTags?: ArticleTagRel[];
};

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private mediaUrl(
    media: { key: string; url: string } | null | undefined,
  ): string {
    if (!media) return '';
    const url = (media.url ?? '').trim();
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      (url.startsWith('/') && !url.startsWith('/media'))
    ) {
      return url;
    }
    return this.storage.publicUrlFor(media.key);
  }

  /** Normalize optional free-text (keeps PartialType / Prisma fields clearly typed). */
  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private include = {
    author: true,
    heroMedia: true,
    audioMedia: true,
    videoMedia: true,
    galleryItems: {
      orderBy: { sortOrder: 'asc' as const },
      include: { media: true },
    },
    seriesEpisodes: {
      take: 1,
      orderBy: { sortOrder: 'asc' as const },
      include: {
        series: {
          select: { id: true, slug: true, titleBg: true, titleEn: true },
        },
      },
    },
    articleTags: {
      include: { tag: true },
    },
  } as const;

  private parseBody(body: Prisma.JsonValue): StoredArticleBlock[] {
    if (!Array.isArray(body)) return [];
    return body as StoredArticleBlock[];
  }

  /**
   * Sync series membership. Order is never set here (append or keep);
   * reordering is DnD-only via PUT /cms/series/:id/episodes.
   */
  private async syncSeriesMembership(
    articleId: string,
    seriesId: string | null | undefined,
  ) {
    if (seriesId === undefined) return;

    if (seriesId === null) {
      await this.prisma.seriesEpisode.deleteMany({ where: { articleId } });
      return;
    }

    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: { id: true },
    });
    if (!series) throw new BadRequestException('Series not found');

    const existing = await this.prisma.seriesEpisode.findFirst({
      where: { articleId },
    });

    if (existing?.seriesId === seriesId) return;

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.seriesEpisode.delete({ where: { id: existing.id } });
      }

      const agg = await tx.seriesEpisode.aggregate({
        where: { seriesId },
        _max: { sortOrder: true },
      });
      const nextOrder = (agg._max.sortOrder ?? -1) + 1;

      await tx.seriesEpisode.create({
        data: {
          seriesId,
          articleId,
          sortOrder: nextOrder,
        },
      });
    });
  }

  /** Preserve EN fields when BG text is unchanged; clear EN when BG changes. */
  private mergeBody(
    incoming: unknown,
    existingJson: Prisma.JsonValue,
  ): { body: StoredArticleBlock[]; bgChanged: boolean } {
    const existing = this.parseBody(existingJson);
    if (!Array.isArray(incoming)) {
      return { body: existing, bgChanged: false };
    }
    const incomingBlocks = incoming as StoredArticleBlock[];
    let bgChanged = incomingBlocks.length !== existing.length;

    const body = incomingBlocks.map((block, i) => {
      const prev = existing[i];
      if (!prev || prev.type !== block.type) {
        bgChanged = true;
        return block;
      }

      if (block.type === 'pullquote' && prev.type === 'pullquote') {
        const textSame = block.textBg === prev.textBg;
        const citeSame = block.citeBg === prev.citeBg;
        if (!textSame || !citeSame) bgChanged = true;
        return {
          type: 'pullquote' as const,
          textBg: block.textBg,
          textEn: textSame ? prev.textEn : null,
          citeBg: block.citeBg,
          citeEn: citeSame ? prev.citeEn : null,
        };
      }

      if (block.type === 'note' && prev.type === 'note') {
        const textSame = block.textBg === prev.textBg;
        const labelSame = block.labelBg === prev.labelBg;
        if (!textSame || !labelSame) bgChanged = true;
        return {
          type: 'note' as const,
          labelBg: block.labelBg,
          labelEn: labelSame ? prev.labelEn : null,
          textBg: block.textBg,
          textEn: textSame ? prev.textEn : null,
        };
      }

      if (
        (block.type === 'paragraph' || block.type === 'caption') &&
        prev.type === block.type
      ) {
        const textSame = block.textBg === prev.textBg;
        if (!textSame) bgChanged = true;
        return {
          type: block.type,
          textBg: block.textBg,
          textEn: textSame ? prev.textEn : null,
        };
      }

      bgChanged = true;
      return block;
    });

    return { body, bgChanged };
  }

  private fieldChanged(
    next: string | null | undefined,
    current: string | null,
  ): boolean {
    return next !== undefined && (next ?? null) !== (current ?? null);
  }

  private galleryFromArticle(article: ArticleWithRelations): GalleryMedia[] {
    const items = article.galleryItems ?? [];
    if (items.length > 0) {
      return items.map((item) => ({
        id: item.media.id,
        url: this.mediaUrl(item.media),
        creditBg: item.media.creditBg,
      }));
    }
    if (article.heroMedia) {
      return [
        {
          id: article.heroMedia.id,
          url: this.mediaUrl(article.heroMedia),
          creditBg: article.heroMedia.creditBg,
        },
      ];
    }
    return [];
  }

  private async replaceGallery(articleId: string, mediaIds: string[]) {
    const unique = [...new Set(mediaIds.filter(Boolean))];
    await this.prisma.articleGalleryItem.deleteMany({ where: { articleId } });
    if (unique.length === 0) {
      await this.prisma.article.update({
        where: { id: articleId },
        data: { heroMediaId: null },
      });
      return;
    }
    await this.prisma.articleGalleryItem.createMany({
      data: unique.map((mediaId, sortOrder) => ({
        articleId,
        mediaId,
        sortOrder,
      })),
    });
    await this.prisma.article.update({
      where: { id: articleId },
      data: { heroMediaId: unique[0] },
    });
  }

  private async syncArticleTags(articleId: string, tagIds: string[]) {
    const unique = [...new Set(tagIds.filter(Boolean))];
    if (unique.length > 0) {
      const found = await this.prisma.tag.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) {
        throw new BadRequestException('One or more tags were not found');
      }
    }
    await this.prisma.articleTag.deleteMany({ where: { articleId } });
    if (unique.length === 0) return;
    await this.prisma.articleTag.createMany({
      data: unique.map((tagId) => ({ articleId, tagId })),
    });
  }

  private tagsFromArticle(article: ArticleWithRelations) {
    return (article.articleTags ?? []).map((row) => ({
      id: row.tag.id,
      slug: row.tag.slug,
      kind: row.tag.kind,
      nameBg: row.tag.nameBg,
      nameEn: row.tag.nameEn,
      name: row.tag.nameEn ?? row.tag.nameBg,
    }));
  }

  toPublicDto(article: ArticleWithRelations): PublicArticleDto {
    const section = toPublicSection(article.section);
    const body = this.parseBody(article.body).map((block) => {
      if (block.type === 'pullquote') {
        return {
          type: 'pullquote' as const,
          text: block.textEn ?? block.textBg,
          textBg: block.textBg,
          cite: block.citeEn ?? block.citeBg,
          citeBg: block.citeBg,
        };
      }
      if (block.type === 'note') {
        return {
          type: 'note' as const,
          label: block.labelEn ?? block.labelBg,
          labelBg: block.labelBg,
          text: block.textEn ?? block.textBg,
          textBg: block.textBg,
        };
      }
      if (block.type === 'caption') {
        return {
          type: 'caption' as const,
          text: block.textEn ?? block.textBg,
          textBg: block.textBg,
        };
      }
      return {
        type: 'paragraph' as const,
        text: block.textEn ?? block.textBg,
        textBg: block.textBg,
      };
    });

    return {
      id: article.id,
      slug: article.slug,
      sourceId: article.id,
      section,
      path: article.path,
      category: article.categoryEn ?? article.categoryBg,
      categoryBg: article.categoryBg,
      title: article.titleEn ?? article.titleBg,
      titleBg: article.titleBg,
      subtitle: article.subtitleEn ?? article.subtitleBg,
      subtitleBg: article.subtitleBg,
      readTime: article.readTimeEn ?? article.readTimeBg,
      readTimeBg: article.readTimeBg,
      location: article.locationEn ?? article.locationBg,
      locationBg: article.locationBg,
      author: article.author?.nameEn ?? article.author?.nameBg ?? '',
      authorBg: article.author?.nameBg ?? '',
      authorSlug: article.author?.slug,
      speaker: article.speakerEn ?? article.speakerBg ?? undefined,
      speakerBg: article.speakerBg ?? undefined,
      date: article.dateEn ?? article.dateBg,
      dateBg: article.dateBg,
      image: this.mediaUrl(article.heroMedia),
      photoCredit: article.photoCreditEn ?? article.photoCreditBg,
      photoCreditBg: article.photoCreditBg,
      audioUrl: article.audioMedia
        ? this.mediaUrl(article.audioMedia)
        : undefined,
      audioDuration: article.audioDuration ?? undefined,
      videoUrl:
        article.videoUrl?.trim() ||
        (article.videoMedia ? this.mediaUrl(article.videoMedia) : undefined) ||
        undefined,
      videoMediaId: article.videoMediaId,
      body,
      endLabel: article.endLabelEn ?? article.endLabelBg,
      endLabelBg: article.endLabelBg,
      status: article.status,
      translationStatus: article.translationStatus,
      featured: article.featured,
      sponsored: article.sponsored,
      sponsorName: this.optionalText(article.sponsorName),
      behindStory: article.behindStoryEn ?? article.behindStoryBg,
      behindStoryBg: article.behindStoryBg,
      seoTitle: article.seoTitleEn ?? article.seoTitleBg,
      seoTitleBg: article.seoTitleBg,
      seoDescription: article.seoDescriptionEn ?? article.seoDescriptionBg,
      seoDescriptionBg: article.seoDescriptionBg,
      gallery: this.galleryFromArticle(article),
      tags: this.tagsFromArticle(article),
      series: (() => {
        const membership = article.seriesEpisodes?.[0];
        if (!membership) return null;
        return {
          id: membership.series.id,
          slug: membership.series.slug,
          title: membership.series.titleEn ?? membership.series.titleBg,
          titleBg: membership.series.titleBg,
          titleEn: membership.series.titleEn,
          episodeNumber: membership.sortOrder + 1,
        };
      })(),
    };
  }

  toCmsDto(article: ArticleWithRelations) {
    const gallery = this.galleryFromArticle(article);
    const membership = article.seriesEpisodes?.[0];
    const tags = this.tagsFromArticle(article);
    return {
      ...this.toPublicDto(article),
      authorId: article.authorId,
      heroMediaId: article.heroMediaId,
      audioMediaId: article.audioMediaId,
      videoMediaId: article.videoMediaId,
      galleryMediaIds: gallery.map((item) => item.id),
      gallery,
      tagIds: tags.map((tag) => tag.id),
      tags,
      bodyRaw: this.parseBody(article.body),
      publishedAt: article.publishedAt,
      translationError: article.translationError,
      sourceLang: article.sourceLang,
      narrationStatus: article.narrationStatus,
      narrationError: article.narrationError,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      series: membership
        ? {
            id: membership.series.id,
            slug: membership.series.slug,
            titleBg: membership.series.titleBg,
            titleEn: membership.series.titleEn,
            episodeNumber: membership.sortOrder + 1,
          }
        : null,
    };
  }

  async listPublic(
    section?: string,
    seriesSlug?: string,
    filters?: {
      location?: string;
      topic?: string;
      category?: string;
      hasAudio?: boolean;
    },
  ) {
    const where: Prisma.ArticleWhereInput = {
      status: ArticleStatus.PUBLISHED,
    };
    const sectionFilter = toPrismaSectionFilter(section);
    if (sectionFilter) {
      where.section = sectionFilter;
    }
    if (filters?.hasAudio === true) {
      where.audioMediaId = { not: null };
    }
    if (seriesSlug?.trim()) {
      where.seriesEpisodes = {
        some: { series: { slug: seriesSlug.trim() } },
      };
    }

    const tagFilters: Array<{ slug: string; kind: TagKind }> = [];
    if (filters?.location?.trim()) {
      tagFilters.push({
        slug: filters.location.trim(),
        kind: TagKind.LOCATION,
      });
    }
    if (filters?.topic?.trim()) {
      tagFilters.push({ slug: filters.topic.trim(), kind: TagKind.TOPIC });
    }
    if (filters?.category?.trim()) {
      tagFilters.push({
        slug: filters.category.trim(),
        kind: TagKind.CATEGORY,
      });
    }
    if (tagFilters.length > 0) {
      where.AND = tagFilters.map((tag) => ({
        articleTags: {
          some: {
            tag: {
              slug: tag.slug,
              kind: tag.kind,
            },
          },
        },
      }));
    }

    const rows = await this.prisma.article.findMany({
      where,
      include: this.include,
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    return rows.map((row) => this.toPublicDto(row));
  }

  async getPublicBySectionSlug(
    section: string,
    slug: string,
    visitorKey?: string,
  ) {
    const sectionFilter = toPrismaSectionFilter(section);
    const row = await this.prisma.article.findFirst({
      where: {
        slug,
        status: ArticleStatus.PUBLISHED,
        ...(sectionFilter ? { section: sectionFilter } : {}),
      },
      include: this.include,
    });
    if (!row) throw new NotFoundException('Article not found');
    const dto = this.toPublicDto(row);
    const relate = await this.relateStats(row.id, visitorKey);
    return { ...dto, ...relate };
  }

  private async relateStats(articleId: string, visitorKey?: string) {
    const kind = 'RELATE';
    const [relateCount, existing] = await Promise.all([
      this.prisma.articleReaction.count({
        where: { articleId, kind },
      }),
      visitorKey?.trim()
        ? this.prisma.articleReaction.findUnique({
            where: {
              articleId_kind_visitorKey: {
                articleId,
                kind,
                visitorKey: visitorKey.trim(),
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    return {
      relateCount,
      viewerHasRelated: Boolean(existing),
    };
  }

  async listRelated(section: string, slug: string, limit = 3) {
    const take = Math.min(6, Math.max(1, Number(limit) || 3));
    const sectionFilter = toPrismaSectionFilter(section);
    const current = await this.prisma.article.findFirst({
      where: {
        slug,
        status: ArticleStatus.PUBLISHED,
        ...(sectionFilter ? { section: sectionFilter } : {}),
      },
      include: {
        articleTags: { include: { tag: true } },
        seriesEpisodes: {
          take: 1,
          select: { seriesId: true },
        },
      },
    });
    if (!current) throw new NotFoundException('Article not found');

    const tagIds = current.articleTags.map((row) => row.tagId);
    const tagKindById = new Map(
      current.articleTags.map((row) => [row.tagId, row.tag.kind]),
    );
    const seriesId = current.seriesEpisodes?.[0]?.seriesId;

    const orFilters: Prisma.ArticleWhereInput[] = [
      { section: current.section },
    ];
    if (tagIds.length > 0) {
      orFilters.push({
        articleTags: { some: { tagId: { in: tagIds } } },
      });
    }
    if (current.authorId) {
      orFilters.push({ authorId: current.authorId });
    }
    if (seriesId) {
      orFilters.push({
        seriesEpisodes: { some: { seriesId } },
      });
    }

    const candidates = await this.prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        id: { not: current.id },
        OR: orFilters,
      },
      include: this.include,
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 48,
    });

    const scored = candidates
      .map((row) => {
        let score = 0;
        if (row.section === current.section) score += 1;
        if (current.authorId && row.authorId === current.authorId) score += 1;
        if (
          seriesId &&
          row.seriesEpisodes?.some((ep) => ep.series.id === seriesId)
        ) {
          score += 2;
        }
        for (const link of row.articleTags ?? []) {
          if (!tagIds.includes(link.tagId)) continue;
          const kind = tagKindById.get(link.tagId);
          if (kind === TagKind.TOPIC || kind === TagKind.LOCATION) score += 3;
          else if (kind === TagKind.CATEGORY) score += 2;
          else score += 1;
        }
        return { row, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTime = a.row.publishedAt?.getTime() ?? 0;
        const bTime = b.row.publishedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, take);

    return scored.map((item) => this.toPublicDto(item.row));
  }

  async addRelate(section: string, slug: string, visitorKey: string) {
    const key = visitorKey.trim();
    if (key.length < 8) {
      throw new BadRequestException('visitorKey is required');
    }
    const sectionFilter = toPrismaSectionFilter(section);
    const article = await this.prisma.article.findFirst({
      where: {
        slug,
        status: ArticleStatus.PUBLISHED,
        ...(sectionFilter ? { section: sectionFilter } : {}),
      },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('Article not found');

    const kind = 'RELATE';
    try {
      await this.prisma.articleReaction.create({
        data: {
          articleId: article.id,
          kind,
          visitorKey: key,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // already related — idempotent
      } else {
        throw error;
      }
    }

    return this.relateStats(article.id, key);
  }

  private async relateCountsByArticleIds(ids: string[]) {
    if (ids.length === 0) return new Map<string, number>();
    const rows = await this.prisma.articleReaction.groupBy({
      by: ['articleId'],
      where: { articleId: { in: ids }, kind: 'RELATE' },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.articleId, row._count._all]));
  }

  async listCms(filters: {
    section?: string;
    status?: ArticleStatus;
    authorId?: string;
    q?: string;
    sponsored?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 9));
    const where: Prisma.ArticleWhereInput = {};
    if (filters.section) where.section = toPrismaSection(filters.section);
    if (filters.status) where.status = filters.status;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.sponsored === true) where.sponsored = true;
    if (filters.q) {
      where.OR = [
        { titleBg: { contains: filters.q, mode: 'insensitive' } },
        { titleEn: { contains: filters.q, mode: 'insensitive' } },
        { slug: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        include: this.include,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const counts = await this.relateCountsByArticleIds(rows.map((r) => r.id));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items: rows.map((row) => ({
        ...this.toCmsDto(row),
        relateCount: counts.get(row.id) ?? 0,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getCmsById(id: string) {
    const row = await this.prisma.article.findUnique({
      where: { id },
      include: this.include,
    });
    if (!row) throw new NotFoundException('Article not found');
    const relate = await this.relateStats(row.id);
    return { ...this.toCmsDto(row), relateCount: relate.relateCount };
  }

  async create(dto: CreateArticleDto) {
    const section = toPrismaSection(dto.section);
    const slug = await ensureUniqueSlug(dto.titleBg, async (candidate) => {
      const found = await this.prisma.article.findUnique({
        where: { section_slug: { section, slug: candidate } },
        select: { id: true },
      });
      return Boolean(found);
    });
    const path = buildArticlePath(section, slug);
    const galleryIds = dto.galleryMediaIds?.filter(Boolean) ?? [];
    const heroMediaId = dto.heroMediaId || galleryIds[0] || undefined;

    const row = await this.prisma.article.create({
      data: {
        section,
        slug,
        path,
        status: dto.status ?? ArticleStatus.DRAFT,
        publishedAt:
          dto.status === ArticleStatus.PUBLISHED
            ? new Date()
            : dto.publishedAt
              ? new Date(dto.publishedAt)
              : null,
        categoryBg: dto.categoryBg,
        titleBg: dto.titleBg,
        subtitleBg: dto.subtitleBg ?? '',
        readTimeBg: dto.readTimeBg ?? '',
        locationBg: dto.locationBg ?? '',
        dateBg: dto.dateBg ?? '',
        photoCreditBg: dto.photoCreditBg ?? '',
        endLabelBg: dto.endLabelBg ?? 'Край',
        speakerBg: dto.speakerBg,
        audioDuration: dto.audioDuration,
        videoUrl: dto.videoUrl?.trim() || null,
        body: (dto.body ?? []) as unknown as Prisma.InputJsonValue,
        featured: dto.featured ?? false,
        sponsored: dto.sponsored ?? false,
        sponsorName: this.optionalText(dto.sponsorName),
        behindStoryBg: dto.behindStoryBg?.trim() ?? '',
        seoTitleBg: this.optionalText(dto.seoTitleBg),
        seoDescriptionBg: this.optionalText(dto.seoDescriptionBg),
        authorId: dto.authorId,
        heroMediaId,
        audioMediaId: dto.audioMediaId,
        videoMediaId: dto.videoMediaId || null,
        translationStatus: TranslationStatus.PENDING,
      },
      include: this.include,
    });

    if (galleryIds.length > 0) {
      await this.replaceGallery(row.id, galleryIds);
    }

    if (dto.tagIds !== undefined) {
      await this.syncArticleTags(row.id, dto.tagIds);
    }

    await this.syncSeriesMembership(row.id, dto.seriesId);
    return this.getCmsById(row.id);
  }

  async update(id: string, dto: UpdateArticleDto) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article not found');

    const section = dto.section
      ? toPrismaSection(dto.section)
      : existing.section;
    const titleBgChanged = this.fieldChanged(dto.titleBg, existing.titleBg);
    const nextSlug = titleBgChanged
      ? await ensureUniqueSlug(dto.titleBg!, async (candidate) => {
          const found = await this.prisma.article.findUnique({
            where: { section_slug: { section, slug: candidate } },
            select: { id: true },
          });
          return Boolean(found && found.id !== id);
        })
      : existing.slug;
    const path = buildArticlePath(section, nextSlug);

    const bodyMerge =
      dto.body !== undefined
        ? this.mergeBody(dto.body, existing.body)
        : { body: this.parseBody(existing.body), bgChanged: false };

    const subtitleBgChanged = this.fieldChanged(
      dto.subtitleBg,
      existing.subtitleBg,
    );
    const categoryBgChanged = this.fieldChanged(
      dto.categoryBg,
      existing.categoryBg,
    );
    const readTimeBgChanged = this.fieldChanged(
      dto.readTimeBg,
      existing.readTimeBg,
    );
    const locationBgChanged = this.fieldChanged(
      dto.locationBg,
      existing.locationBg,
    );
    const dateBgChanged = this.fieldChanged(dto.dateBg, existing.dateBg);
    const photoCreditBgChanged = this.fieldChanged(
      dto.photoCreditBg,
      existing.photoCreditBg,
    );
    const endLabelBgChanged = this.fieldChanged(
      dto.endLabelBg,
      existing.endLabelBg,
    );
    const speakerBgChanged = this.fieldChanged(
      dto.speakerBg,
      existing.speakerBg,
    );
    const behindStoryBgChanged = this.fieldChanged(
      dto.behindStoryBg,
      existing.behindStoryBg,
    );
    const seoTitleBgChanged = this.fieldChanged(
      dto.seoTitleBg,
      existing.seoTitleBg,
    );
    const seoDescriptionBgChanged = this.fieldChanged(
      dto.seoDescriptionBg,
      existing.seoDescriptionBg,
    );

    const textChanged =
      titleBgChanged ||
      subtitleBgChanged ||
      categoryBgChanged ||
      readTimeBgChanged ||
      locationBgChanged ||
      dateBgChanged ||
      photoCreditBgChanged ||
      endLabelBgChanged ||
      speakerBgChanged ||
      behindStoryBgChanged ||
      seoTitleBgChanged ||
      seoDescriptionBgChanged ||
      bodyMerge.bgChanged;

    await this.prisma.article.update({
      where: { id },
      data: {
        section,
        slug: nextSlug,
        path,
        status: dto.status,
        publishedAt:
          dto.status === ArticleStatus.PUBLISHED && !existing.publishedAt
            ? new Date()
            : dto.publishedAt !== undefined
              ? dto.publishedAt
                ? new Date(dto.publishedAt)
                : null
              : undefined,
        categoryBg: dto.categoryBg,
        titleBg: dto.titleBg,
        subtitleBg: dto.subtitleBg,
        readTimeBg: dto.readTimeBg,
        locationBg: dto.locationBg,
        dateBg: dto.dateBg,
        photoCreditBg: dto.photoCreditBg,
        endLabelBg: dto.endLabelBg,
        speakerBg: dto.speakerBg,
        audioDuration: dto.audioDuration,
        ...(dto.videoUrl !== undefined
          ? { videoUrl: dto.videoUrl?.trim() || null }
          : {}),
        ...(dto.behindStoryBg !== undefined
          ? { behindStoryBg: dto.behindStoryBg.trim() }
          : {}),
        ...(dto.seoTitleBg !== undefined
          ? { seoTitleBg: this.optionalText(dto.seoTitleBg) }
          : {}),
        ...(dto.seoDescriptionBg !== undefined
          ? { seoDescriptionBg: this.optionalText(dto.seoDescriptionBg) }
          : {}),
        body:
          dto.body !== undefined
            ? (bodyMerge.body as unknown as Prisma.InputJsonValue)
            : undefined,
        featured: dto.featured,
        sponsored: dto.sponsored,
        ...(dto.sponsorName !== undefined
          ? { sponsorName: this.optionalText(dto.sponsorName) }
          : {}),
        authorId: dto.authorId,
        heroMediaId: dto.heroMediaId,
        audioMediaId: dto.audioMediaId,
        ...(dto.videoMediaId !== undefined
          ? { videoMediaId: dto.videoMediaId || null }
          : {}),
        ...(textChanged
          ? {
              translationStatus: TranslationStatus.PENDING,
              translationError: null,
              ...(titleBgChanged ? { titleEn: null } : {}),
              ...(subtitleBgChanged ? { subtitleEn: null } : {}),
              ...(categoryBgChanged ? { categoryEn: null } : {}),
              ...(readTimeBgChanged ? { readTimeEn: null } : {}),
              ...(locationBgChanged ? { locationEn: null } : {}),
              ...(dateBgChanged ? { dateEn: null } : {}),
              ...(photoCreditBgChanged ? { photoCreditEn: null } : {}),
              ...(endLabelBgChanged ? { endLabelEn: null } : {}),
              ...(speakerBgChanged ? { speakerEn: null } : {}),
              ...(behindStoryBgChanged ? { behindStoryEn: null } : {}),
              ...(seoTitleBgChanged ? { seoTitleEn: null } : {}),
              ...(seoDescriptionBgChanged ? { seoDescriptionEn: null } : {}),
            }
          : {}),
      },
      include: this.include,
    });

    if (dto.galleryMediaIds !== undefined) {
      await this.replaceGallery(id, dto.galleryMediaIds);
    }

    if (dto.tagIds !== undefined) {
      await this.syncArticleTags(id, dto.tagIds);
    }

    await this.syncSeriesMembership(id, dto.seriesId);
    return this.getCmsById(id);
  }

  async remove(id: string) {
    await this.prisma.article.findUniqueOrThrow({ where: { id } });
    await this.prisma.article.delete({ where: { id } });
    return { ok: true as const, id };
  }

  async markTranslation(
    id: string,
    data: {
      status: TranslationStatus;
      error?: string | null;
      fields?: Partial<{
        categoryEn: string;
        titleEn: string;
        subtitleEn: string;
        readTimeEn: string;
        locationEn: string;
        dateEn: string;
        photoCreditEn: string;
        endLabelEn: string;
        speakerEn: string | null;
        body: StoredArticleBlock[];
      }>;
    },
  ) {
    return this.prisma.article.update({
      where: { id },
      data: {
        translationStatus: data.status,
        translationError: data.error ?? null,
        ...(data.fields ?? {}),
        body:
          data.fields?.body !== undefined
            ? (data.fields.body as unknown as Prisma.InputJsonValue)
            : undefined,
      },
      include: this.include,
    });
  }

  async getRawForTranslation(id: string) {
    const row = await this.prisma.article.findUnique({
      where: { id },
      include: this.include,
    });
    if (!row) throw new NotFoundException('Article not found');
    return row;
  }
}
