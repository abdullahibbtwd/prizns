import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ArticleStatus,
  SubmissionStatus,
  TranslationStatus,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('cms/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Global CMS quick search — stories, authors, submissions, tags (places/topics).
   */
  @Get('search')
  async search(@Query('q') qRaw?: string) {
    const q = (qRaw ?? '').trim();
    if (q.length < 2) {
      return {
        q,
        stories: [],
        authors: [],
        submissions: [],
        tags: [],
      };
    }

    const take = 8;
    const [stories, authors, submissions, tags] = await Promise.all([
      this.prisma.article.findMany({
        where: {
          OR: [
            { titleBg: { contains: q, mode: 'insensitive' } },
            { titleEn: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { categoryBg: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          titleBg: true,
          titleEn: true,
          status: true,
          categoryBg: true,
          author: { select: { nameBg: true, nameEn: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take,
      }),
      this.prisma.author.findMany({
        where: {
          OR: [
            { nameBg: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { locationBg: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          nameBg: true,
          nameEn: true,
          roleBg: true,
          roleEn: true,
          locationBg: true,
          _count: { select: { articles: true } },
        },
        orderBy: { nameBg: 'asc' },
        take,
      }),
      this.prisma.submission.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { place: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          name: true,
          place: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.tag.findMany({
        where: {
          OR: [
            { nameBg: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          kind: true,
          nameBg: true,
          nameEn: true,
          slug: true,
        },
        orderBy: { nameBg: 'asc' },
        take,
      }),
    ]);

    return {
      q,
      stories: stories.map((s) => ({
        id: s.id,
        titleBg: s.titleBg,
        titleEn: s.titleEn,
        status: s.status,
        categoryBg: s.categoryBg,
        authorBg: s.author?.nameBg ?? null,
        authorEn: s.author?.nameEn ?? null,
      })),
      authors: authors.map((a) => ({
        id: a.id,
        nameBg: a.nameBg,
        nameEn: a.nameEn,
        roleBg: a.roleBg,
        roleEn: a.roleEn,
        locationBg: a.locationBg,
        stories: a._count.articles,
      })),
      submissions: submissions.map((s) => ({
        id: s.id,
        title: s.title,
        name: s.name,
        place: s.place,
        status: s.status,
      })),
      tags: tags.map((t) => ({
        id: t.id,
        kind: t.kind,
        nameBg: t.nameBg,
        nameEn: t.nameEn,
        slug: t.slug,
      })),
    };
  }

  @Get('checklist')
  async checklist() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      pendingSubmissions,
      reviewArticles,
      failedTranslations,
      publishedToday,
      draftArticles,
      scheduledArticles,
    ] = await Promise.all([
      this.prisma.submission.count({
        where: {
          status: { in: [SubmissionStatus.NEW, SubmissionStatus.REVIEW] },
        },
      }),
      this.prisma.article.count({
        where: { status: ArticleStatus.REVIEW },
      }),
      this.prisma.article.count({
        where: { translationStatus: TranslationStatus.FAILED },
      }),
      this.prisma.article.count({
        where: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: { gte: startOfDay },
        },
      }),
      this.prisma.article.count({
        where: { status: ArticleStatus.DRAFT },
      }),
      this.prisma.article.count({
        where: { status: ArticleStatus.SCHEDULED },
      }),
    ]);

    return {
      pendingSubmissions,
      reviewArticles,
      failedTranslations,
      publishedToday,
      draftArticles,
      scheduledArticles,
    };
  }
}
