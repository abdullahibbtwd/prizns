import { Injectable, NotFoundException } from '@nestjs/common'
import { ArticleStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  listBadges() {
    return this.prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameBg: 'asc' }],
      include: { _count: { select: { authors: true } } },
    })
  }

  listCmsBadges() {
    return this.prisma.badge.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameBg: 'asc' }],
      include: {
        _count: { select: { authors: true } },
        authors: {
          take: 8,
          orderBy: { awardedAt: 'desc' },
          include: {
            author: {
              select: { id: true, slug: true, nameBg: true, nameEn: true },
            },
          },
        },
      },
    })
  }

  async badgesForAuthor(authorId: string) {
    const rows = await this.prisma.authorBadge.findMany({
      where: { authorId },
      orderBy: { awardedAt: 'asc' },
      include: { badge: true },
    })
    return rows
      .filter((row) => row.badge.isActive)
      .map((row) => ({
        id: row.badge.id,
        slug: row.badge.slug,
        nameBg: row.badge.nameBg,
        nameEn: row.badge.nameEn,
        descriptionBg: row.badge.descriptionBg,
        descriptionEn: row.badge.descriptionEn,
        icon: row.badge.icon,
        awardedAt: row.awardedAt.toISOString(),
        source: row.source,
      }))
  }

  /** Award all threshold badges the author qualifies for. */
  async evaluateAuthor(authorId: string) {
    const author = await this.prisma.author.findUnique({
      where: { id: authorId },
      select: { id: true },
    })
    if (!author) return { awarded: [] as string[] }

    const published = await this.prisma.article.count({
      where: { authorId, status: ArticleStatus.PUBLISHED },
    })

    const eligible = await this.prisma.badge.findMany({
      where: {
        isActive: true,
        minPublished: { not: null, lte: published },
      },
    })

    const awarded: string[] = []
    for (const badge of eligible) {
      const row = await this.prisma.authorBadge.upsert({
        where: {
          authorId_badgeId: { authorId, badgeId: badge.id },
        },
        create: { authorId, badgeId: badge.id, source: 'auto' },
        update: {},
      })
      awarded.push(row.badgeId)
    }
    return { awarded, published }
  }

  async awardManual(authorId: string, badgeId: string) {
    const [author, badge] = await Promise.all([
      this.prisma.author.findUnique({ where: { id: authorId }, select: { id: true } }),
      this.prisma.badge.findUnique({ where: { id: badgeId } }),
    ])
    if (!author) throw new NotFoundException('Author not found')
    if (!badge) throw new NotFoundException('Badge not found')

    return this.prisma.authorBadge.upsert({
      where: { authorId_badgeId: { authorId, badgeId } },
      create: { authorId, badgeId, source: 'manual' },
      update: { source: 'manual' },
    })
  }

  async revoke(authorId: string, badgeId: string) {
    await this.prisma.authorBadge.deleteMany({ where: { authorId, badgeId } })
    return { ok: true as const }
  }
}
