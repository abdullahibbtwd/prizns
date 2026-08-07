import { Controller, Get, UseGuards } from '@nestjs/common';
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
