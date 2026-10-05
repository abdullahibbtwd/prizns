/**
 * Sync article.section (+ path) from linked CMS categories.
 *
 * Fixes the desync where CMS category is Events (etc.) but public listings
 * still use section=places because WordPress import / merge left the old section.
 *
 *   npm run repair:section-from-category --prefix api -- --dry-run
 *   npm run repair:section-from-category --prefix api
 *
 * Optional:
 *   --from=places --to=events   only move places → events mismatches
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient, type ArticleSection } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { buildArticlePath } from '../articles/section.util';
import { sectionFromCategorySlugs } from '../categories/category-section';
import { ensureUniqueSlug } from '../common/slug.util';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

function flagValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() || undefined : undefined;
}

const dryRun = process.argv.includes('--dry-run');
const onlyFrom = flagValue('from') as ArticleSection | undefined;
const onlyTo = flagValue('to') as ArticleSection | undefined;

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    new ConfigService().get<string>('DATABASE_URL');
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        slug: true,
        section: true,
        path: true,
        titleBg: true,
        articleCategories: {
          select: {
            category: {
              select: {
                slug: true,
                nameBg: true,
                parent: { select: { slug: true } },
              },
            },
          },
        },
      },
    });

    let moved = 0;
    let skippedNoCategory = 0;
    let unchanged = 0;
    let slugRenamed = 0;
    const byMove = new Map<string, number>();

    for (const article of articles) {
      const slugs = article.articleCategories.flatMap((row) => [
        row.category.slug,
        row.category.parent?.slug,
      ]);
      if (slugs.every((slug) => !slug)) {
        skippedNoCategory += 1;
        continue;
      }

      const nextSection = sectionFromCategorySlugs(
        slugs,
        article.section,
      ) as ArticleSection;

      if (article.section === nextSection) {
        unchanged += 1;
        continue;
      }
      if (onlyFrom && article.section !== onlyFrom) continue;
      if (onlyTo && nextSection !== onlyTo) continue;

      let nextSlug = article.slug;
      const clash = await prisma.article.findUnique({
        where: {
          section_slug: { section: nextSection, slug: article.slug },
        },
        select: { id: true },
      });
      if (clash && clash.id !== article.id) {
        nextSlug = await ensureUniqueSlug(
          article.titleBg || article.slug,
          async (candidate) => {
            const found = await prisma.article.findUnique({
              where: {
                section_slug: { section: nextSection, slug: candidate },
              },
              select: { id: true },
            });
            return Boolean(found && found.id !== article.id);
          },
        );
        slugRenamed += 1;
      }

      const nextPath = buildArticlePath(nextSection, nextSlug);
      const key = `${article.section}→${nextSection}`;
      byMove.set(key, (byMove.get(key) ?? 0) + 1);
      moved += 1;

      const primaryName =
        article.articleCategories[0]?.category.nameBg ?? undefined;

      console.log(
        `${dryRun ? '[dry-run] ' : ''}${article.path} → ${nextPath}${
          nextSlug !== article.slug ? ` (slug ${article.slug}→${nextSlug})` : ''
        }${primaryName ? ` [${primaryName}]` : ''}`,
      );

      if (!dryRun) {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            section: nextSection,
            slug: nextSlug,
            path: nextPath,
            ...(primaryName ? { categoryBg: primaryName } : {}),
          },
        });
      }
    }

    console.log(
      `${dryRun ? '[dry-run] ' : ''}moved ${moved}, unchanged ${unchanged}, no category ${skippedNoCategory}, slug renamed ${slugRenamed}`,
    );
    for (const [key, count] of [...byMove.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${count} ${key}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error && error.cause) {
    console.error(error.cause);
  }
  process.exit(1);
});
