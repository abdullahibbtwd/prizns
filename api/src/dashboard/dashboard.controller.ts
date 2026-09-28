import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ArticleStatus,
  Prisma,
  SubmissionStatus,
  TranslationStatus,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import {
  SUBMISSION_ROLES,
  canManageAllStories,
  canPublishStories,
  userHasAnyRole,
} from '../auth/role-access';
import { PrismaService } from '../prisma/prisma.service';

type DashboardUser = Pick<AuthUserPayload, 'id' | 'role' | 'roles'>;

const QUEUE_SIZE = 5;

@Controller('cms/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /** Authors and contributors only count and find their own stories. */
  private async articleScope(
    user: DashboardUser,
  ): Promise<Prisma.ArticleWhereInput> {
    if (canManageAllStories(user)) return {};
    const author = await this.prisma.author.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return { authorId: author?.id ?? '__none__' };
  }

  /**
   * Global CMS quick search — stories, authors, submissions, tags (places/topics).
   */
  @Get('search')
  async search(
    @Query('q') qRaw: string | undefined,
    @CurrentUser() user: DashboardUser,
  ) {
    const q = (qRaw ?? '').trim();
    if (q.length < 2) {
      return {
        q,
        stories: [],
        authors: [],
        submissions: [],
        tags: [],
        categories: [],
      };
    }

    const take = 8;
    const scope = await this.articleScope(user);
    const canSeeSubmissions = userHasAnyRole(user, SUBMISSION_ROLES);
    const [stories, authors, submissions, tags, categories] = await Promise.all(
      [
        this.prisma.article.findMany({
          where: {
            ...scope,
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
        canSeeSubmissions
          ? this.prisma.submission.findMany({
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
            })
          : Promise.resolve([]),
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
        this.prisma.category.findMany({
          where: {
            OR: [
              { nameBg: { contains: q, mode: 'insensitive' } },
              { nameEn: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            nameBg: true,
            nameEn: true,
            slug: true,
            parentId: true,
          },
          orderBy: { nameBg: 'asc' },
          take,
        }),
      ],
    );

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
      categories: categories.map((c) => ({
        id: c.id,
        nameBg: c.nameBg,
        nameEn: c.nameEn,
        slug: c.slug,
        parentId: c.parentId,
      })),
    };
  }

  @Get('checklist')
  async checklist(@CurrentUser() user: DashboardUser) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const scope = await this.articleScope(user);
    const canSeeSubmissions = userHasAnyRole(user, SUBMISSION_ROLES);
    const isPublisher = canPublishStories(user);
    const count = (where: Prisma.ArticleWhereInput) =>
      this.prisma.article.count({ where: { ...scope, ...where } });

    const [
      pendingSubmissions,
      reviewArticles,
      failedTranslations,
      publishedToday,
      draftArticles,
      scheduledArticles,
      reviewQueue,
      changesRequested,
    ] = await Promise.all([
      canSeeSubmissions
        ? this.prisma.submission.count({
            where: {
              status: { in: [SubmissionStatus.NEW, SubmissionStatus.REVIEW] },
            },
          })
        : Promise.resolve(0),
      count({ status: ArticleStatus.REVIEW }),
      count({ translationStatus: TranslationStatus.FAILED }),
      count({
        status: ArticleStatus.PUBLISHED,
        publishedAt: { gte: startOfDay },
      }),
      count({ status: ArticleStatus.DRAFT }),
      count({ status: ArticleStatus.SCHEDULED }),
      isPublisher
        ? this.prisma.article.findMany({
            where: { status: ArticleStatus.REVIEW },
            orderBy: [
              { submittedForReviewAt: { sort: 'asc', nulls: 'last' } },
              { updatedAt: 'asc' },
            ],
            take: QUEUE_SIZE,
            select: {
              id: true,
              titleBg: true,
              titleEn: true,
              submittedForReviewAt: true,
              updatedAt: true,
              author: { select: { nameBg: true, nameEn: true } },
            },
          })
        : Promise.resolve([]),
      isPublisher
        ? Promise.resolve([])
        : this.prisma.article.findMany({
            where: {
              ...scope,
              status: ArticleStatus.DRAFT,
              reviewNote: { not: null },
            },
            orderBy: { reviewNoteAt: 'desc' },
            take: QUEUE_SIZE,
            select: {
              id: true,
              titleBg: true,
              titleEn: true,
              reviewNote: true,
              reviewNoteAt: true,
            },
          }),
    ]);

    return {
      pendingSubmissions,
      reviewArticles,
      failedTranslations,
      publishedToday,
      draftArticles,
      scheduledArticles,
      reviewQueue: reviewQueue.map((row) => ({
        id: row.id,
        titleBg: row.titleBg,
        titleEn: row.titleEn,
        authorBg: row.author?.nameBg ?? null,
        authorEn: row.author?.nameEn ?? null,
        submittedAt: row.submittedForReviewAt ?? row.updatedAt,
      })),
      changesRequested: changesRequested.map((row) => ({
        id: row.id,
        titleBg: row.titleBg,
        titleEn: row.titleEn,
        reviewNote: row.reviewNote,
        reviewNoteAt: row.reviewNoteAt,
      })),
    };
  }
}
