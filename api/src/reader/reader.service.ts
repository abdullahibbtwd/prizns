import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ArticleStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private assertEnabled() {
    const flag = this.config
      .get<string>('FEATURE_READER_AUTH')
      ?.trim()
      .toLowerCase()
    if (flag === 'false' || flag === '0') {
      throw new ServiceUnavailableException(
        'Reader auth is disabled. Set FEATURE_READER_AUTH=true to enable.',
      )
    }
  }

  async listSaves(readerId: string) {
    this.assertEnabled()
    const rows = await this.prisma.savedArticle.findMany({
      where: { readerId },
      orderBy: { createdAt: 'desc' },
      include: {
        article: {
          select: {
            id: true,
            section: true,
            slug: true,
            path: true,
            status: true,
            titleBg: true,
            titleEn: true,
            subtitleBg: true,
            subtitleEn: true,
            categoryBg: true,
            categoryEn: true,
            locationBg: true,
            locationEn: true,
            publishedAt: true,
            heroMedia: { select: { url: true } },
          },
        },
      },
    })

    return rows
      .filter((row) => row.article.status === ArticleStatus.PUBLISHED)
      .map((row) => ({
        id: row.id,
        savedAt: row.createdAt.toISOString(),
        article: {
          id: row.article.id,
          section: row.article.section,
          slug: row.article.slug,
          path: row.article.path,
          titleBg: row.article.titleBg,
          titleEn: row.article.titleEn,
          subtitleBg: row.article.subtitleBg,
          subtitleEn: row.article.subtitleEn,
          categoryBg: row.article.categoryBg,
          categoryEn: row.article.categoryEn,
          locationBg: row.article.locationBg,
          locationEn: row.article.locationEn,
          publishedAt: row.article.publishedAt?.toISOString() ?? null,
          heroUrl: row.article.heroMedia?.url ?? null,
        },
      }))
  }

  async saveArticle(readerId: string, articleId: string) {
    this.assertEnabled()
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, status: ArticleStatus.PUBLISHED },
      select: { id: true },
    })
    if (!article) {
      throw new NotFoundException('Article not found')
    }

    const row = await this.prisma.savedArticle.upsert({
      where: {
        readerId_articleId: { readerId, articleId },
      },
      create: { readerId, articleId },
      update: {},
    })

    return { ok: true as const, saved: true as const, id: row.id }
  }

  async unsaveArticle(readerId: string, articleId: string) {
    this.assertEnabled()
    await this.prisma.savedArticle.deleteMany({
      where: { readerId, articleId },
    })
    return { ok: true as const, saved: false as const }
  }

  async isSaved(readerId: string, articleId: string) {
    this.assertEnabled()
    const row = await this.prisma.savedArticle.findUnique({
      where: {
        readerId_articleId: { readerId, articleId },
      },
      select: { id: true },
    })
    return { saved: Boolean(row) }
  }
}
