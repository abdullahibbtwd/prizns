import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsClickKind, ArticleStatus, Prisma } from '@prisma/client';
import { checkRateLimit } from '../common/rate-limit';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildArticlePath,
  toPublicSection,
  type PublicSection,
} from '../articles/section.util';
import { AnalyticsBeaconDto } from './dto/beacon.dto';

export type PopularStory = {
  id: string;
  slug: string;
  path: string;
  section: PublicSection;
  title: string;
  titleBg: string;
};

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
          readerId: dto.readerId?.trim() || null,
          userAgent: userAgent?.slice(0, 400) || null,
          lastSeenAt: now,
        },
      });
      sessionId = created.id;
    } else {
      await this.prisma.analyticsSession.update({
        where: { id: sessionId },
        data: {
          lastSeenAt: now,
          ...(dto.readerId?.trim()
            ? { readerId: dto.readerId.trim() }
            : {}),
        },
      });
    }

    if (dto.event === 'click') {
      return this.recordClick(dto, sessionId, path);
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

  private async recordClick(
    dto: AnalyticsBeaconDto,
    sessionId: string,
    path: string,
  ) {
    const visitorKey = dto.visitorKey.trim().slice(0, 80);
    if (!checkRateLimit('analytics-click', visitorKey, 40, 60_000)) {
      return { sessionId, ignored: true as const };
    }

    const href = this.normalizeHref(dto.href);
    if (!href) {
      return { sessionId, ignored: true as const };
    }

    const kind = this.clickKind(dto.kind, href);
    const label = (dto.label ?? '').trim().slice(0, 120);

    await this.prisma.analyticsClick.create({
      data: {
        sessionId,
        visitorKey,
        readerId: dto.readerId?.trim() || null,
        path: path.slice(0, 500),
        href: href.slice(0, 500),
        label,
        kind,
        articleId: dto.articleId?.trim() || null,
      },
    });
    return { sessionId };
  }

  private normalizeHref(raw?: string): string | null {
    const value = raw?.trim();
    if (!value) return null;
    const lower = value.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:')
    ) {
      return null;
    }
    if (value.startsWith('#')) return null;
    try {
      if (value.startsWith('/') && !value.startsWith('//')) {
        return value.split('#')[0].slice(0, 500);
      }
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return `${url.origin}${url.pathname}${url.search}`.slice(0, 500);
    } catch {
      return value.split('#')[0].slice(0, 500) || null;
    }
  }

  private clickKind(
    kind: AnalyticsBeaconDto['kind'],
    href: string,
  ): AnalyticsClickKind {
    if (kind === 'cta') return AnalyticsClickKind.cta;
    if (kind === 'outbound') return AnalyticsClickKind.outbound;
    if (kind === 'internal') return AnalyticsClickKind.internal;
    if (href.startsWith('/')) return AnalyticsClickKind.internal;
    return AnalyticsClickKind.outbound;
  }

  private async periodStats(start: Date, end: Date) {
    const where: Prisma.PageViewWhereInput = {
      startedAt: { gte: start, lt: end },
    };

    const [pageviews, dwell, visitors, loggedInSessions, anonymousSessions] =
      await Promise.all([
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
        this.prisma.analyticsSession.count({
          where: {
            lastSeenAt: { gte: start, lt: end },
            readerId: { not: null },
          },
        }),
        this.prisma.analyticsSession.count({
          where: {
            lastSeenAt: { gte: start, lt: end },
            readerId: null,
          },
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
      loggedInSessions,
      anonymousSessions,
    };
  }

  async summary(range: AnalyticsRange = 'today') {
    const { start, end, prevStart, prevEnd } = rangeWindow(range);
    const [current, previous, topPagesRaw, topStoriesRaw, dailyRaw, sourceRows, topClicksRaw] =
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
        this.prisma.analyticsClick.groupBy({
          by: ['href'],
          where: { createdAt: { gte: start, lt: end } },
          _count: { _all: true },
          orderBy: { _count: { href: 'desc' } },
          take: 10,
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

    const clickHrefs = topClicksRaw.map((row) => row.href);
    const clickSamples = clickHrefs.length
      ? await this.prisma.analyticsClick.findMany({
          where: {
            href: { in: clickHrefs },
            createdAt: { gte: start, lt: end },
          },
          select: { href: true, label: true, kind: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const clickMeta = new Map<string, { label: string; kind: string }>();
    for (const row of clickSamples) {
      if (!clickMeta.has(row.href)) {
        clickMeta.set(row.href, { label: row.label, kind: row.kind });
      }
    }

    return {
      range,
      visitors: current.visitors,
      pageviews: current.pageviews,
      avgDwellMs: current.avgDwellMs,
      avgDwellLabel: formatDuration(current.avgDwellMs),
      totalDwellMs: current.totalDwellMs,
      totalDwellLabel: formatDuration(current.totalDwellMs),
      loggedInSessions: current.loggedInSessions,
      anonymousSessions: current.anonymousSessions,
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
      topClicks: topClicksRaw.map((row) => {
        const meta = clickMeta.get(row.href);
        return {
          href: row.href,
          clicks: row._count._all,
          label: meta?.label?.trim() || row.href,
          kind: meta?.kind || 'internal',
        };
      }),
      daily: dailyRaw.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        views: Number(row.views),
      })),
    };
  }

  /** Top published stories for the public search overlay: visits, then relates, then newest. */
  async popularStories(limit = 5): Promise<PopularStory[]> {
    const take = Math.min(10, Math.max(1, Math.floor(Number(limit)) || 5));
    const { start, end } = rangeWindow('month');

    const [topViews, topRelates] = await Promise.all([
      this.prisma.pageView.groupBy({
        by: ['articleId'],
        where: {
          startedAt: { gte: start, lt: end },
          articleId: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { articleId: 'desc' } },
        take: take * 4,
      }),
      this.prisma.articleReaction.groupBy({
        by: ['articleId'],
        where: { kind: 'RELATE' },
        _count: { _all: true },
        orderBy: { _count: { articleId: 'desc' } },
        take: take * 4,
      }),
    ]);

    const orderedIds: string[] = [];
    const seen = new Set<string>();
    for (const row of topViews) {
      if (row.articleId && !seen.has(row.articleId)) {
        seen.add(row.articleId);
        orderedIds.push(row.articleId);
      }
    }
    for (const row of topRelates) {
      if (!seen.has(row.articleId)) {
        seen.add(row.articleId);
        orderedIds.push(row.articleId);
      }
    }

    const publishedSelect = {
      id: true,
      slug: true,
      path: true,
      section: true,
      titleBg: true,
      titleEn: true,
    } as const;

    const ranked = orderedIds.length
      ? await this.prisma.article.findMany({
          where: {
            id: { in: orderedIds },
            status: ArticleStatus.PUBLISHED,
          },
          select: publishedSelect,
        })
      : [];
    const rankedMap = new Map(ranked.map((article) => [article.id, article]));
    const picked = orderedIds
      .map((id) => rankedMap.get(id))
      .filter((article): article is (typeof ranked)[number] => Boolean(article))
      .slice(0, take);

    if (picked.length < take) {
      const more = await this.prisma.article.findMany({
        where: {
          status: ArticleStatus.PUBLISHED,
          id: { notIn: picked.map((article) => article.id) },
        },
        orderBy: { publishedAt: 'desc' },
        take: take - picked.length,
        select: publishedSelect,
      });
      picked.push(...more);
    }

    return picked.map((article) => ({
      id: article.id,
      slug: article.slug,
      path: article.path
        ? normalizePath(article.path)
        : buildArticlePath(article.section, article.slug),
      section: toPublicSection(article.section),
      title: article.titleEn || article.titleBg,
      titleBg: article.titleBg,
    }));
  }
}
