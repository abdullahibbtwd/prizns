import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsBeaconDto } from './dto/beacon.dto';

export type AnalyticsRange = 'today' | 'week' | 'month';

function rangeWindow(range: AnalyticsRange) {
  const end = new Date();
  const start = new Date(end);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }

  const prevEnd = new Date(start);
  const prevStart = new Date(start);
  const ms = end.getTime() - start.getTime();
  prevStart.setTime(prevStart.getTime() - ms);

  return { start, end, prevStart, prevEnd };
}

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/** Decode percent-encoded paths so Cyrillic slugs stay readable. */
function normalizePath(raw: string) {
  const trimmed = raw.trim().slice(0, 500);
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function referrerHost(referrer: string | null | undefined): string | null {
  const value = referrer?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.host || null;
  } catch {
    return value.slice(0, 120);
  }
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async beacon(dto: AnalyticsBeaconDto, userAgent?: string) {
    const now = new Date();
    const path = normalizePath(dto.path);
    if (path.startsWith('/cms')) {
      return { ignored: true as const };
    }

    let sessionId = dto.sessionId;
    if (sessionId) {
      const existing = await this.prisma.analyticsSession.findUnique({
        where: { id: sessionId },
        select: { id: true },
      });
      if (!existing) sessionId = undefined;
    }

    if (!sessionId) {
      const created = await this.prisma.analyticsSession.create({
        data: {
          visitorKey: dto.visitorKey.trim().slice(0, 80),
          userAgent: userAgent?.slice(0, 400) || null,
          lastSeenAt: now,
        },
      });
      sessionId = created.id;
    } else {
      await this.prisma.analyticsSession.update({
        where: { id: sessionId },
        data: { lastSeenAt: now },
      });
    }

    if (dto.event === 'pageview') {
      const view = await this.prisma.pageView.create({
        data: {
          sessionId,
          path,
          articleId: dto.articleId?.trim() || null,
          title: dto.title?.trim().slice(0, 240) || null,
          referrer: dto.referrer?.trim().slice(0, 500) || null,
          utmSource: dto.utmSource?.trim().slice(0, 120) || null,
          utmMedium: dto.utmMedium?.trim().slice(0, 120) || null,
          utmCampaign: dto.utmCampaign?.trim().slice(0, 120) || null,
          dwellMs: Math.max(0, dto.dwellMs ?? 0),
        },
      });
      return { sessionId, pageViewId: view.id };
    }

    if (!dto.pageViewId) {
      throw new NotFoundException('pageViewId required for heartbeat/leave');
    }

    const view = await this.prisma.pageView.findFirst({
      where: { id: dto.pageViewId, sessionId },
    });
    if (!view) throw new NotFoundException('Page view not found');

    const dwellMs = Math.max(view.dwellMs, Math.max(0, dto.dwellMs ?? 0));
    const updated = await this.prisma.pageView.update({
      where: { id: view.id },
      data: {
        dwellMs,
        endedAt: dto.event === 'leave' ? now : view.endedAt,
        // Attach story meta if it arrived after the initial pageview
        ...(dto.articleId?.trim() && !view.articleId
          ? { articleId: dto.articleId.trim() }
          : {}),
        ...(dto.title?.trim() && !view.title
          ? { title: dto.title.trim().slice(0, 240) }
          : {}),
      },
    });

    return { sessionId, pageViewId: updated.id };
  }

  private async periodStats(start: Date, end: Date) {
    const where: Prisma.PageViewWhereInput = {
      startedAt: { gte: start, lt: end },
    };

    const [pageviews, dwell, visitors] = await Promise.all([
      this.prisma.pageView.count({ where }),
      this.prisma.pageView.aggregate({
        where: { ...where, dwellMs: { gt: 0 } },
        _avg: { dwellMs: true },
        _sum: { dwellMs: true },
      }),
      this.prisma.pageView.findMany({
        where,
        select: { session: { select: { visitorKey: true } } },
        distinct: ['sessionId'],
      }),
    ]);

    const uniqueVisitors = new Set(
      visitors.map((row) => row.session.visitorKey),
    ).size;

    return {
      visitors: uniqueVisitors,
      pageviews,
      avgDwellMs: Math.round(dwell._avg.dwellMs ?? 0),
      totalDwellMs: dwell._sum.dwellMs ?? 0,
    };
  }

  async summary(range: AnalyticsRange = 'today') {
    const { start, end, prevStart, prevEnd } = rangeWindow(range);
    const [current, previous, topPagesRaw, topStoriesRaw, dailyRaw, sourceRows] =
      await Promise.all([
        this.periodStats(start, end),
        this.periodStats(prevStart, prevEnd),
        this.prisma.pageView.groupBy({
          by: ['path'],
          where: { startedAt: { gte: start, lt: end } },
          _count: { _all: true },
          _avg: { dwellMs: true },
          orderBy: { _count: { path: 'desc' } },
          take: 10,
        }),
        this.prisma.pageView.groupBy({
          by: ['articleId'],
          where: {
            startedAt: { gte: start, lt: end },
            articleId: { not: null },
          },
          _count: { _all: true },
          _avg: { dwellMs: true },
          orderBy: { _count: { articleId: 'desc' } },
          take: 10,
        }),
        this.prisma.$queryRaw<Array<{ day: Date; views: bigint }>>`
          SELECT date_trunc('day', started_at) AS day, COUNT(*)::bigint AS views
          FROM page_views
          WHERE started_at >= ${start} AND started_at < ${end}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        this.prisma.pageView.findMany({
          where: { startedAt: { gte: start, lt: end } },
          select: { utmSource: true, referrer: true },
        }),
      ]);

    const articleIds = topStoriesRaw
      .map((row) => row.articleId)
      .filter((id): id is string => Boolean(id));

    const articles = articleIds.length
      ? await this.prisma.article.findMany({
          where: { id: { in: articleIds } },
          select: {
            id: true,
            titleBg: true,
            titleEn: true,
            path: true,
            section: true,
          },
        })
      : [];
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    const trendPct = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const sourceCounts = new Map<string, number>();
    for (const row of sourceRows) {
      const label =
        row.utmSource?.trim() ||
        referrerHost(row.referrer) ||
        'direct';
      sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
    }
    const trafficSources = [...sourceCounts.entries()]
      .map(([source, views]) => ({ source, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      range,
      visitors: current.visitors,
      pageviews: current.pageviews,
      avgDwellMs: current.avgDwellMs,
      avgDwellLabel: formatDuration(current.avgDwellMs),
      totalDwellMs: current.totalDwellMs,
      totalDwellLabel: formatDuration(current.totalDwellMs),
      visitorsTrendPct: trendPct(current.visitors, previous.visitors),
      pageviewsTrendPct: trendPct(current.pageviews, previous.pageviews),
      previous: {
        visitors: previous.visitors,
        pageviews: previous.pageviews,
        avgDwellMs: previous.avgDwellMs,
        avgDwellLabel: formatDuration(previous.avgDwellMs),
      },
      topPages: topPagesRaw.map((row) => ({
        path: normalizePath(row.path),
        views: row._count._all,
        avgDwellMs: Math.round(row._avg.dwellMs ?? 0),
        avgDwellLabel: formatDuration(Math.round(row._avg.dwellMs ?? 0)),
      })),
      topStories: topStoriesRaw.map((row) => {
        const article = row.articleId
          ? articleMap.get(row.articleId)
          : undefined;
        return {
          articleId: row.articleId,
          title: article?.titleEn || article?.titleBg || 'Untitled story',
          path: article?.path ? normalizePath(article.path) : null,
          views: row._count._all,
          avgDwellMs: Math.round(row._avg.dwellMs ?? 0),
          avgDwellLabel: formatDuration(Math.round(row._avg.dwellMs ?? 0)),
        };
      }),
      trafficSources,
      daily: dailyRaw.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        views: Number(row.views),
      })),
    };
  }
}
