/**
 * Flatten subcategories onto main categories, then drop WordPress leftovers.
 *
 * 1. Merge every subcategory into its pillar (Human stories, Our places, …).
 *    News and Voices stay as their own roots (different public sections).
 * 2. WordPress city / OPIK / Business leftovers → main category + location tags.
 *
 * Dry run (no writes):
 *   node dist/wordpress-import/merge-wordpress-categories.js --dry-run
 *
 * Apply on the API container:
 *   docker compose exec api node dist/wordpress-import/merge-wordpress-categories.js
 *
 * Default leftover mapping (no flags needed):
 *   Vidin / Vratsa / Montana → Our places (cities stay as location tags)
 *   OPIK → Campaigns
 *   Business → Human stories (those stories get the sponsored badge)
 *
 * Override or add mappings:
 *   ... --merge=video:choveshki-istorii
 *
 * Also keep city category links (in addition to the topic):
 *   ... --also-link-cities
 * Keep empty leftover categories instead of deleting them:
 *   ... --keep-merged-categories
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type ArticleSection } from '@prisma/client';
import { buildArticlePath } from '../articles/section.util';
import {
  DEFAULT_CATEGORY_MERGE,
  HIDDEN_CMS_CATEGORY_SLUGS,
  isLocationCategorySlug,
  parseMergeFlag,
  resolveCategoryPlacement,
  shouldMarkSponsored,
} from '../categories/canonical-categories';
import { flattenCategoryTree } from '../categories/flatten-categories';
import { sectionFromCategorySlugs } from '../categories/category-section';
import { attachLocationTags } from './location-tags';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

type Flags = {
  merge?: string;
  'dry-run'?: boolean;
  'also-link-cities'?: boolean;
  'keep-merged-categories'?: boolean;
  'no-default-merge'?: boolean;
};

function parseFlags(argv: string[]): Flags {
  const flags: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      flags[arg.slice(2)] = true;
    } else {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    }
  }
  return flags as Flags;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const dryRun = Boolean(flags['dry-run']);
  const alsoLinkCities = Boolean(flags['also-link-cities']);
  const keepMerged = Boolean(flags['keep-merged-categories']);
  const noDefaultMerge = Boolean(flags['no-default-merge']);
  const merge = parseMergeFlag(flags.merge);
  const dropSlugs = new Set([
    ...(noDefaultMerge ? [] : Object.keys(DEFAULT_CATEGORY_MERGE)),
    ...Object.keys(merge),
  ]);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const flattened = await flattenCategoryTree(prisma, { dryRun });
    console.log(
      `${dryRun ? '[dry-run] ' : ''}flatten subcategories: merged ${flattened.merged}, promoted ${flattened.promoted}, relinked ${flattened.relinked}`,
    );

    const categories = await prisma.category.findMany({
      select: { id: true, slug: true, nameBg: true, parentId: true },
    });
    const bySlug = new Map(categories.map((row) => [row.slug, row]));
    const byId = new Map(categories.map((row) => [row.id, row]));

    const articles = await prisma.article.findMany({
      select: {
        id: true,
        slug: true,
        section: true,
        path: true,
        categoryBg: true,
        sponsored: true,
        articleCategories: {
          select: { categoryId: true },
        },
      },
    });

    let changed = 0;
    let unchanged = 0;
    let sectionChanged = 0;
    let skippedSection = 0;
    let sponsoredMarked = 0;
    const toCounts = new Map<string, number>();

    for (const article of articles) {
      const currentSlugs = article.articleCategories
        .map((row) => byId.get(row.categoryId)?.slug)
        .filter((slug): slug is string => Boolean(slug));
      const placement = resolveCategoryPlacement(
        currentSlugs,
        article.section,
        { merge, alsoLinkCities, noDefaultMerge },
      );
      const nextSlugs = placement.categorySlugs;
      const nextSection = sectionFromCategorySlugs(
        nextSlugs,
        article.section,
      ) as ArticleSection;
      const primary = placement.primarySlug
        ? bySlug.get(placement.primarySlug)
        : undefined;
      const sameCategories =
        currentSlugs.length === nextSlugs.length &&
        currentSlugs.every((slug) => nextSlugs.includes(slug));
      const sameSection = article.section === nextSection;
      const markSponsored = shouldMarkSponsored(currentSlugs);

      if (
        sameCategories &&
        sameSection &&
        placement.locationSlugs.length === 0 &&
        !markSponsored
      ) {
        unchanged += 1;
        continue;
      }

      const label = `${currentSlugs.join(', ') || '(none)'} → ${nextSlugs.join(', ') || '(none)'}${markSponsored ? ' sponsored' : ''}`;
      if (dryRun) {
        console.log(
          `[dry-run] ${article.path} ${label}${sameSection ? '' : ` section ${article.section}→${nextSection}`}`,
        );
      } else {
        const nextIds = nextSlugs
          .map((slug) => bySlug.get(slug)?.id)
          .filter((id): id is string => Boolean(id));
        await prisma.articleCategory.deleteMany({
          where: { articleId: article.id },
        });
        if (nextIds.length > 0) {
          await prisma.articleCategory.createMany({
            data: nextIds.map((categoryId) => ({
              articleId: article.id,
              categoryId,
            })),
            skipDuplicates: true,
          });
        }
        await attachLocationTags(prisma, article.id, placement.locationSlugs);

        const data: {
          categoryBg?: string;
          section?: ArticleSection;
          path?: string;
          sponsored?: boolean;
        } = {};
        if (primary) data.categoryBg = primary.nameBg;
        if (markSponsored && !article.sponsored) data.sponsored = true;

        if (!sameSection) {
          const clash = await prisma.article.findUnique({
            where: {
              section_slug: { section: nextSection, slug: article.slug },
            },
            select: { id: true },
          });
          if (clash && clash.id !== article.id) {
            skippedSection += 1;
            console.warn(
              `keep section ${article.section} for ${article.slug} (${nextSection}/${article.slug} already exists)`,
            );
          } else {
            data.section = nextSection;
            data.path = buildArticlePath(nextSection, article.slug);
            sectionChanged += 1;
          }
        }

        if (Object.keys(data).length > 0) {
          await prisma.article.update({
            where: { id: article.id },
            data,
          });
        }
      }

      if (markSponsored && !article.sponsored) sponsoredMarked += 1;
      for (const slug of nextSlugs) {
        toCounts.set(slug, (toCounts.get(slug) ?? 0) + 1);
      }
      changed += 1;
    }

    console.log(
      `${dryRun ? '[dry-run] ' : ''}articles ${articles.length}, updated ${changed}, unchanged ${unchanged}, section moved ${sectionChanged}, section skipped ${skippedSection}, sponsored ${sponsoredMarked}`,
    );
    const ranked = [...toCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [slug, count] of ranked) {
      console.log(`  ${count} ${slug}`);
    }

    if (!keepMerged) {
      let dropped = 0;
      for (const slug of dropSlugs) {
        const row = bySlug.get(slug);
        if (!row) continue;
        if (alsoLinkCities && isLocationCategorySlug(slug)) continue;
        const childCount = await prisma.category.count({
          where: { parentId: row.id },
        });
        if (childCount > 0) {
          console.warn(`keep ${slug}: still has ${childCount} subcategor${childCount === 1 ? 'y' : 'ies'}`);
          continue;
        }
        if (dryRun) {
          console.log(`[dry-run] delete leftover category ${slug}`);
        } else {
          await prisma.articleCategory.deleteMany({
            where: { categoryId: row.id },
          });
          await prisma.category.delete({ where: { id: row.id } });
          console.log(`deleted leftover category ${slug}`);
        }
        dropped += 1;
      }
      console.log(
        `${dryRun ? '[dry-run] ' : ''}dropped ${dropped} leftover categor${dropped === 1 ? 'y' : 'ies'} (${[...HIDDEN_CMS_CATEGORY_SLUGS].join(', ')})`,
      );
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
