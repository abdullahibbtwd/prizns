import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArticleStatus, TranslationStatus } from '@prisma/client';
import { ensureUniqueSlug } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSeriesDto,
  SetSeriesEpisodesDto,
  UpdateSeriesDto,
} from './dto/series.dto';

const episodeInclude = {
  article: {
    select: {
      id: true,
      slug: true,
      section: true,
      path: true,
      status: true,
      titleBg: true,
      titleEn: true,
      categoryBg: true,
      heroMedia: { select: { id: true, url: true } },
    },
  },
} as const;

const seriesInclude = {
  coverMedia: { select: { id: true, url: true } },
  episodes: {
    orderBy: { sortOrder: 'asc' as const },
    include: episodeInclude,
  },
  _count: { select: { episodes: true } },
} as const;

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.series
      .findMany({
        orderBy: { updatedAt: 'desc' },
        include: seriesInclude,
      })
      .then((rows) => rows.map((row) => this.withEpisodeStats(row)));
  }

  async listPublic() {
    const rows = await this.prisma.series.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      include: {
        coverMedia: { select: { id: true, url: true } },
        episodes: {
          where: { article: { status: ArticleStatus.PUBLISHED } },
          orderBy: { sortOrder: 'asc' },
          include: episodeInclude,
        },
        _count: {
          select: {
            episodes: {
              where: { article: { status: ArticleStatus.PUBLISHED } },
            },
          },
        },
      },
    });
    return rows.map((row) => this.toPublicDto(row));
  }

  async getPublicBySlug(slug: string) {
    const row = await this.prisma.series.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        coverMedia: { select: { id: true, url: true } },
        episodes: {
          where: { article: { status: ArticleStatus.PUBLISHED } },
          orderBy: { sortOrder: 'asc' },
          include: episodeInclude,
        },
        _count: {
          select: {
            episodes: {
              where: { article: { status: ArticleStatus.PUBLISHED } },
            },
          },
        },
      },
    });
    return row ? this.toPublicDto(row) : null;
  }

  private toPublicDto(row: {
    id: string;
    slug: string;
    titleBg: string;
    titleEn: string | null;
    descriptionBg: string;
    descriptionEn: string | null;
    coverMedia: { id: string; url: string } | null;
    episodes: Array<{
      sortOrder: number;
      article: {
        id: string;
        slug: string;
        path: string;
        titleBg: string;
        titleEn: string | null;
        status: string;
        heroMedia?: { id: string; url: string } | null;
      };
    }>;
    _count: { episodes: number };
  }) {
    const count = row._count.episodes;
    const first = row.episodes[0]?.article;
    return {
      id: row.id,
      slug: row.slug,
      title: row.titleEn ?? row.titleBg,
      titleBg: row.titleBg,
      description: row.descriptionEn ?? row.descriptionBg,
      descriptionBg: row.descriptionBg,
      image: row.coverMedia?.url ?? first?.heroMedia?.url ?? '',
      count: `${count} Stories`,
      countBg: `${count} Истории`,
      episodeCount: count,
      path: first?.path ?? '/stories',
      episodes: row.episodes.map((ep) => ({
        sortOrder: ep.sortOrder,
        articleId: ep.article.id,
        slug: ep.article.slug,
        path: ep.article.path,
        title: ep.article.titleEn ?? ep.article.titleBg,
        titleBg: ep.article.titleBg,
      })),
    };
  }

  async getById(id: string) {
    const row = await this.prisma.series.findUnique({
      where: { id },
      include: seriesInclude,
    });
    if (!row) throw new NotFoundException('Series not found');
    return this.withEpisodeStats(row);
  }

  private withEpisodeStats<
    T extends {
      episodes: Array<{ article: { status: string } }>;
      _count?: { episodes: number };
    },
  >(row: T) {
    const stats = {
      total: row.episodes.length,
      published: 0,
      draft: 0,
      scheduled: 0,
      review: 0,
      archived: 0,
    };
    for (const ep of row.episodes) {
      const key = ep.article.status.toLowerCase() as keyof typeof stats;
      if (key in stats && key !== 'total') {
        stats[key] += 1;
      }
    }
    return { ...row, episodeStats: stats };
  }

  private async slugFromTitle(titleBg: string, excludeId?: string) {
    return ensureUniqueSlug(titleBg, async (candidate) => {
      const found = await this.prisma.series.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(found && found.id !== excludeId);
    });
  }

  async create(dto: CreateSeriesDto) {
    const titleBg = dto.titleBg.trim();
    const slug = await this.slugFromTitle(titleBg);

    return this.prisma.series.create({
      data: {
        slug,
        titleBg,
        titleEn: null,
        descriptionBg: dto.descriptionBg?.trim() || '',
        descriptionEn: null,
        status: dto.status ?? 'DRAFT',
        coverMediaId: dto.coverMediaId || null,
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
      include: seriesInclude,
    }).then((row) => this.withEpisodeStats(row));
  }

  async update(id: string, dto: UpdateSeriesDto) {
    const existing = await this.prisma.series.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Series not found');

    const titleBg = dto.titleBg?.trim();
    const descriptionBg =
      dto.descriptionBg !== undefined
        ? dto.descriptionBg.trim()
        : undefined;

    const titleChanged =
      titleBg !== undefined && titleBg !== existing.titleBg;
    const bgChanged =
      titleChanged ||
      (descriptionBg !== undefined &&
        descriptionBg !== existing.descriptionBg);

    const slug = titleChanged
      ? await this.slugFromTitle(titleBg!, id)
      : undefined;

    return this.prisma.series.update({
      where: { id },
      data: {
        ...(titleBg ? { titleBg } : {}),
        ...(slug ? { slug } : {}),
        ...(descriptionBg !== undefined ? { descriptionBg } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.coverMediaId !== undefined
          ? { coverMediaId: dto.coverMediaId || null }
          : {}),
        ...(bgChanged
          ? {
              titleEn: null,
              descriptionEn: null,
              translationStatus: TranslationStatus.PENDING,
              translationError: null,
            }
          : {}),
      },
      include: seriesInclude,
    }).then((row) => this.withEpisodeStats(row));
  }

  async setEpisodes(id: string, dto: SetSeriesEpisodesDto) {
    const existing = await this.prisma.series.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Series not found');

    const articleIds = [...new Set(dto.articleIds.filter(Boolean))];
    if (articleIds.length) {
      const found = await this.prisma.article.findMany({
        where: { id: { in: articleIds } },
        select: { id: true },
      });
      if (found.length !== articleIds.length) {
        throw new BadRequestException('One or more articles were not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.seriesEpisode.deleteMany({ where: { seriesId: id } });
      if (!articleIds.length) return;
      await tx.seriesEpisode.createMany({
        data: articleIds.map((articleId, index) => ({
          seriesId: id,
          articleId,
          sortOrder: index,
        })),
      });
    });

    return this.getById(id);
  }
}
