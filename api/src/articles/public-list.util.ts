import type { Prisma } from '@prisma/client';
import { parseDayBoundary } from './cms-list.util';

/** Public listing sorts only — never reuse CMS sorts (updated/created). */
export const PUBLIC_ARTICLE_SORTS = [
  'newest',
  'oldest',
  'az',
  'za',
] as const;

export type PublicArticleSort = (typeof PUBLIC_ARTICLE_SORTS)[number];

export const PUBLIC_LIST_MAX_PAGE = 200;
export const PUBLIC_LIST_MAX_PAGE_SIZE = 50;
export const PUBLIC_LIST_DEFAULT_PAGE_SIZE = 30;

export function parsePublicArticleSort(value?: string): PublicArticleSort {
  const v = value?.trim().toLowerCase();
  if (v === 'a-z' || v === 'title' || v === 'title-asc') return 'az';
  if (v === 'z-a' || v === 'title-desc') return 'za';
  return (PUBLIC_ARTICLE_SORTS as readonly string[]).includes(v ?? '')
    ? (v as PublicArticleSort)
    : 'newest';
}

/**
 * Stable offset pagination: always end with `id` so ties cannot
 * duplicate or drop rows across pages.
 * Alphabet sorts use titleBg (editorial BG title).
 */
export function publicArticleOrderBy(
  sort: PublicArticleSort = 'newest',
): Prisma.ArticleOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ publishedAt: 'asc' }, { id: 'asc' }];
    case 'az':
      return [{ titleBg: 'asc' }, { id: 'asc' }];
    case 'za':
      return [{ titleBg: 'desc' }, { id: 'desc' }];
    default:
      return [{ publishedAt: 'desc' }, { id: 'desc' }];
  }
}

/** Build publishedAt filter: live only, optional calendar day range. */
export function publicPublishedAtFilter(
  now: Date,
  dateFrom?: string,
  dateTo?: string,
): Prisma.DateTimeNullableFilter {
  const from = parseDayBoundary(dateFrom, 'start');
  const to = parseDayBoundary(dateTo, 'end');
  const upper = to && to.getTime() < now.getTime() ? to : now;
  const filter: Prisma.DateTimeNullableFilter = {
    not: null,
    lte: upper,
  };
  if (from) filter.gte = from;
  return filter;
}

export function clampPublicListPage(page: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(PUBLIC_LIST_MAX_PAGE, Math.floor(page));
}

export function clampPublicListPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    return PUBLIC_LIST_DEFAULT_PAGE_SIZE;
  }
  return Math.min(PUBLIC_LIST_MAX_PAGE_SIZE, Math.floor(pageSize));
}
