/**
 * Repair Place/Topic tag duplicates and missing coordinates.
 *
 *   npm run repair:tags --prefix api
 *   npm run repair:tags --prefix api -- --dry-run
 *
 * - Removes TOPIC tags for Видин / Враца / Монтана when a LOCATION tag exists
 * - Renames LOCATION slug `vratza` → `vratsa` (official Bulgarian transliteration)
 * - Fills missing lat/lng from known city centres (or Nominatim)
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { GeocodeStatus, PrismaClient, TagKind } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import {
  LOCATION_CATEGORY_NAMES,
  LOCATION_CATEGORY_SLUGS,
  LOCATION_KNOWN_COORDS,
  LOCATION_SLUG_ALIASES,
  type LocationCategorySlug,
  canonicalizeLocationSlug,
} from '../categories/canonical-categories';
import { geocodeNominatim } from '../tags/geocode.util';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

const dryRun = process.argv.includes('--dry-run');

async function ensureLocationTag(
  prisma: PrismaClient,
  slug: LocationCategorySlug,
) {
  const names = LOCATION_CATEGORY_NAMES[slug];
  const coords = LOCATION_KNOWN_COORDS[slug];
  const existing = await prisma.tag.findUnique({
    where: { kind_slug: { kind: TagKind.LOCATION, slug } },
  });
  if (existing) {
    const needsCoords = existing.lat == null || existing.lng == null;
    if (!needsCoords && existing.nameEn === names.nameEn) return existing;
    if (dryRun) {
      console.log(
        `[dry-run] update LOCATION/${slug}${needsCoords ? ' +coords' : ''}`,
      );
      return existing;
    }
    return prisma.tag.update({
      where: { id: existing.id },
      data: {
        nameBg: names.nameBg,
        nameEn: names.nameEn,
        ...(needsCoords
          ? {
              lat: coords.lat,
              lng: coords.lng,
              geocodeStatus: GeocodeStatus.manual,
              geocodedAt: new Date(),
            }
          : {}),
      },
    });
  }

  if (dryRun) {
    console.log(`[dry-run] create LOCATION/${slug}`);
    return null;
  }
  return prisma.tag.create({
    data: {
      kind: TagKind.LOCATION,
      slug,
      nameBg: names.nameBg,
      nameEn: names.nameEn,
      lat: coords.lat,
      lng: coords.lng,
      geocodeStatus: GeocodeStatus.manual,
      geocodedAt: new Date(),
    },
  });
}

async function renameVratzaTag(prisma: PrismaClient) {
  const legacy = await prisma.tag.findUnique({
    where: { kind_slug: { kind: TagKind.LOCATION, slug: 'vratza' } },
  });
  if (!legacy) return;

  const target = await prisma.tag.findUnique({
    where: { kind_slug: { kind: TagKind.LOCATION, slug: 'vratsa' } },
  });

  if (dryRun) {
    console.log(
      target
        ? '[dry-run] merge LOCATION/vratza → vratsa'
        : '[dry-run] rename LOCATION/vratza → vratsa',
    );
    return;
  }

  if (!target) {
    await prisma.tag.update({
      where: { id: legacy.id },
      data: {
        slug: 'vratsa',
        nameBg: LOCATION_CATEGORY_NAMES.vratsa.nameBg,
        nameEn: LOCATION_CATEGORY_NAMES.vratsa.nameEn,
      },
    });
    return;
  }

  const links = await prisma.articleTag.findMany({
    where: { tagId: legacy.id },
  });
  for (const link of links) {
    await prisma.articleTag.createMany({
      data: [{ articleId: link.articleId, tagId: target.id }],
      skipDuplicates: true,
    });
  }
  await prisma.articleTag.deleteMany({ where: { tagId: legacy.id } });
  await prisma.tag.delete({ where: { id: legacy.id } });
}

async function removeDuplicateTopicCities(prisma: PrismaClient) {
  for (const raw of Object.keys(LOCATION_SLUG_ALIASES)) {
    const canonical = canonicalizeLocationSlug(raw);
    if (!canonical) continue;
    const topic = await prisma.tag.findUnique({
      where: { kind_slug: { kind: TagKind.TOPIC, slug: raw } },
    });
    if (!topic) continue;

    const place = await prisma.tag.findUnique({
      where: { kind_slug: { kind: TagKind.LOCATION, slug: canonical } },
    });
    if (!place) continue;

    if (dryRun) {
      console.log(
        `[dry-run] drop TOPIC/${raw} (LOCATION/${canonical} exists)`,
      );
      continue;
    }

    const links = await prisma.articleTag.findMany({
      where: { tagId: topic.id },
    });
    for (const link of links) {
      await prisma.articleTag.createMany({
        data: [{ articleId: link.articleId, tagId: place.id }],
        skipDuplicates: true,
      });
    }
    await prisma.articleTag.deleteMany({ where: { tagId: topic.id } });
    await prisma.tag.delete({ where: { id: topic.id } });
    console.log(`Removed TOPIC/${raw}`);
  }
}

async function fillMissingCoords(prisma: PrismaClient) {
  const places = await prisma.tag.findMany({
    where: {
      kind: TagKind.LOCATION,
      OR: [{ lat: null }, { lng: null }],
    },
  });

  for (const place of places) {
    const canonical = canonicalizeLocationSlug(place.slug);
    const known = canonical ? LOCATION_KNOWN_COORDS[canonical] : null;
    let point = known;
    if (!point) {
      const hit = await geocodeNominatim(
        place.nameEn?.trim() || place.nameBg,
      );
      point = hit;
    }
    if (!point) {
      console.log(`No coords for LOCATION/${place.slug}`);
      continue;
    }
    if (dryRun) {
      console.log(
        `[dry-run] geocode LOCATION/${place.slug} → ${point.lat},${point.lng}`,
      );
      continue;
    }
    await prisma.tag.update({
      where: { id: place.id },
      data: {
        lat: point.lat,
        lng: point.lng,
        geocodeStatus: known ? GeocodeStatus.manual : GeocodeStatus.ok,
        geocodedAt: new Date(),
      },
    });
    console.log(`Geocoded LOCATION/${place.slug}`);
  }
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    new ConfigService().get<string>('DATABASE_URL');
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  try {
    for (const slug of LOCATION_CATEGORY_SLUGS) {
      await ensureLocationTag(prisma, slug);
    }
    await renameVratzaTag(prisma);
    await removeDuplicateTopicCities(prisma);
    await fillMissingCoords(prisma);
    console.log(dryRun ? 'Dry run complete.' : 'Tag repair complete.');
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
