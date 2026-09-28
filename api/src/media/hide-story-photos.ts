/**
 * One-off: hide story photos from the public /gallery in bulk.
 *
 *   npm run gallery:hide-story-photos --prefix api -- --dry-run   # preview
 *   npm run gallery:hide-story-photos --prefix api                # apply
 *
 * On the VPS (API container):
 *   docker compose exec api npm run gallery:hide-story-photos -- --dry-run
 *   docker compose exec api npm run gallery:hide-story-photos
 *
 * Hidden: images used in any story that is not an event, WordPress imports
 * (`wp/…`), reader submissions (`submissions/…`), shop images and series covers.
 * Kept as they are: images used in an event story (`--keep-sections=events`
 * by default) and images uploaded straight to the media library (not used
 * anywhere). Only ever hides — re-running never un-hides a manual choice.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { MediaKind, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

export type GalleryAssetFacts = {
  key: string;
  /** Sections of every story that uses the image (hero, gallery or body). */
  sections: string[];
  usedOutsideStories: boolean;
};

const IMPORTED_PREFIXES = ['wp/', 'submissions/', 'shop/'];

export function shouldHideFromGallery(
  asset: GalleryAssetFacts,
  keepSections: ReadonlySet<string>,
): boolean {
  if (asset.sections.some((section) => keepSections.has(section))) return false;
  if (asset.sections.length > 0) return true;
  if (asset.usedOutsideStories) return true;
  return IMPORTED_PREFIXES.some((prefix) => asset.key.startsWith(prefix));
}

function bodyMediaIds(body: unknown): string[] {
  if (!Array.isArray(body)) return [];
  const ids: string[] = [];
  for (const block of body as Array<Record<string, unknown>>) {
    if (typeof block?.mediaId === 'string' && block.mediaId) ids.push(block.mediaId);
  }
  return ids;
}

function parseKeepSections(argv: string[]): Set<string> {
  const arg = argv.find((value) => value.startsWith('--keep-sections='));
  const raw = arg ? arg.slice('--keep-sections='.length) : 'events';
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const keepSections = parseKeepSections(process.argv);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const [images, articles, seriesCovers, productHeroes, productGallery] =
      await Promise.all([
        prisma.mediaAsset.findMany({
          where: { kind: MediaKind.IMAGE, showInGallery: true },
          select: { id: true, key: true },
        }),
        prisma.article.findMany({
          select: {
            section: true,
            heroMediaId: true,
            body: true,
            galleryItems: { select: { mediaId: true } },
          },
        }),
        prisma.series.findMany({
          where: { coverMediaId: { not: null } },
          select: { coverMediaId: true },
        }),
        prisma.product.findMany({
          where: { imageMediaId: { not: null } },
          select: { imageMediaId: true },
        }),
        prisma.productGalleryItem.findMany({ select: { mediaId: true } }),
      ]);

    const sectionsByMedia = new Map<string, Set<string>>();
    const addUse = (mediaId: string | null | undefined, section: string) => {
      if (!mediaId) return;
      const set = sectionsByMedia.get(mediaId) ?? new Set<string>();
      set.add(section);
      sectionsByMedia.set(mediaId, set);
    };
    for (const article of articles) {
      addUse(article.heroMediaId, article.section);
      for (const item of article.galleryItems) addUse(item.mediaId, article.section);
      for (const id of bodyMediaIds(article.body)) addUse(id, article.section);
    }

    const outside = new Set<string>(
      [
        ...seriesCovers.map((row) => row.coverMediaId),
        ...productHeroes.map((row) => row.imageMediaId),
        ...productGallery.map((row) => row.mediaId),
      ].filter((id): id is string => Boolean(id)),
    );

    let kept = 0;
    let keptKeepSection = 0;
    const toHide: string[] = [];
    for (const image of images) {
      const sections = [...(sectionsByMedia.get(image.id) ?? [])];
      const hide = shouldHideFromGallery(
        { key: image.key, sections, usedOutsideStories: outside.has(image.id) },
        keepSections,
      );
      if (hide) toHide.push(image.id);
      else {
        kept += 1;
        if (sections.some((section) => keepSections.has(section))) keptKeepSection += 1;
      }
    }

    console.log(`Images currently shown in gallery: ${images.length}`);
    console.log(`  to hide (story / imported photos): ${toHide.length}`);
    console.log(
      `  keep shown: ${kept} (${keptKeepSection} from ${[...keepSections].join(', ') || 'no'} stories, ${kept - keptKeepSection} media-library uploads)`,
    );

    if (dryRun) {
      console.log('Dry run — nothing changed. Re-run without --dry-run to apply.');
      return;
    }

    let updated = 0;
    for (let i = 0; i < toHide.length; i += 500) {
      const result = await prisma.mediaAsset.updateMany({
        where: { id: { in: toHide.slice(i, i + 500) } },
        data: { showInGallery: false },
      });
      updated += result.count;
    }
    console.log(`Hidden from gallery: ${updated}. Photos stay in their stories.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
