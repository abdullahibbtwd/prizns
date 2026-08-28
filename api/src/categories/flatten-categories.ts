import type { PrismaClient } from '@prisma/client';
import { CATEGORY_SLUG_TO_SECTION } from './category-section';

type FlattenDb = Pick<PrismaClient, 'category' | 'articleCategory' | 'article'>;

export type FlattenResult = {
  merged: number;
  promoted: number;
  relinked: number;
};

function shouldPromote(childSlug: string, parentSlug: string) {
  const childSection = CATEGORY_SLUG_TO_SECTION[childSlug];
  const parentSection = CATEGORY_SLUG_TO_SECTION[parentSlug];
  return Boolean(
    childSection && parentSection && childSection !== parentSection,
  );
}

type CategoryNode = {
  id: string;
  slug: string;
  nameBg: string;
  parentId: string | null;
};

function rootOf(child: CategoryNode, byId: Map<string, CategoryNode>) {
  let cursor = child;
  const seen = new Set<string>();
  while (cursor.parentId && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    const parent = byId.get(cursor.parentId);
    if (!parent) break;
    cursor = parent;
  }
  return cursor;
}

/**
 * Collapse every subcategory onto its main (root) category, then delete it.
 * Children that belong to a different public section (News, Voices) are
 * promoted to roots instead of being folded into the wrong pillar.
 */
export async function flattenCategoryTree(
  prisma: FlattenDb,
  opts: { dryRun?: boolean } = {},
): Promise<FlattenResult> {
  const dryRun = Boolean(opts.dryRun);
  const rows = await prisma.category.findMany({
    select: { id: true, slug: true, nameBg: true, parentId: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const children = rows.filter((row) => row.parentId);

  let merged = 0;
  let promoted = 0;
  let relinked = 0;

  const toPromote: string[] = [];
  const toMerge: Array<{ childId: string; parentId: string; parentNameBg: string }> =
    [];

  for (const child of children) {
    const parent = child.parentId ? byId.get(child.parentId) : undefined;
    if (!parent) continue;
    const root = rootOf(child, byId);
    if (shouldPromote(child.slug, parent.slug) || shouldPromote(child.slug, root.slug)) {
      toPromote.push(child.id);
      continue;
    }
    toMerge.push({
      childId: child.id,
      parentId: root.id,
      parentNameBg: root.nameBg,
    });
  }

  if (dryRun) {
    return {
      merged: toMerge.length,
      promoted: toPromote.length,
      relinked: 0,
    };
  }

  if (toPromote.length > 0) {
    await prisma.category.updateMany({
      where: { id: { in: toPromote } },
      data: { parentId: null },
    });
    promoted = toPromote.length;
  }

  for (const item of toMerge) {
    const links = await prisma.articleCategory.findMany({
      where: { categoryId: item.childId },
      select: { articleId: true },
    });
    for (const link of links) {
      const already = await prisma.articleCategory.findUnique({
        where: {
          articleId_categoryId: {
            articleId: link.articleId,
            categoryId: item.parentId,
          },
        },
        select: { articleId: true },
      });
      if (!already) {
        await prisma.articleCategory.create({
          data: {
            articleId: link.articleId,
            categoryId: item.parentId,
          },
        });
      }
      await prisma.article.update({
        where: { id: link.articleId },
        data: { categoryBg: item.parentNameBg },
      });
      relinked += 1;
    }
    await prisma.articleCategory.deleteMany({
      where: { categoryId: item.childId },
    });
    await prisma.category.delete({ where: { id: item.childId } });
    merged += 1;
  }

  return { merged, promoted, relinked };
}
