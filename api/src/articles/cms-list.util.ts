import type { Prisma } from '@prisma/client';

export const CMS_ARTICLE_SORTS = [
  'published',
  'updated',
  'created',
  'title',
] as const;

export type CmsArticleSort = (typeof CMS_ARTICLE_SORTS)[number];

export function parseCmsArticleSort(value?: string): CmsArticleSort {
  const v = value?.trim().toLowerCase();
  return (CMS_ARTICLE_SORTS as readonly string[]).includes(v ?? '')
    ? (v as CmsArticleSort)
    : 'published';
}

/**
 * Default is publish date so editing an old story doesn't push it to page 1.
 * Unpublished drafts (no publish date) follow, newest first.
 */
export function cmsArticleOrderBy(
  sort: CmsArticleSort = 'published',
): Prisma.ArticleOrderByWithRelationInput[] {
  switch (sort) {
    case 'updated':
      return [{ updatedAt: 'desc' }];
    case 'created':
      return [{ createdAt: 'desc' }];
    case 'title':
      return [{ titleBg: 'asc' }];
    default:
      return [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ];
  }
}

/** "2026-09-28" → start/end of that day (UTC); full ISO strings pass through. */
export function parseDayBoundary(
  value: string | undefined,
  edge: 'start' | 'end',
): Date | null {
  const v = value?.trim();
  if (!v) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? `${v}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`
    : v;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
