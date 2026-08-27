import { TagKind, type PrismaClient } from '@prisma/client';
import {
  LOCATION_CATEGORY_NAMES,
  isLocationCategorySlug,
  type LocationCategorySlug,
} from '../categories/canonical-categories';

export async function attachLocationTags(
  prisma: PrismaClient,
  articleId: string,
  slugs: LocationCategorySlug[],
) {
  for (const slug of slugs) {
    if (!isLocationCategorySlug(slug)) continue;
    const names = LOCATION_CATEGORY_NAMES[slug];
    const tag = await prisma.tag.upsert({
      where: { kind_slug: { kind: TagKind.LOCATION, slug } },
      update: { nameBg: names.nameBg, nameEn: names.nameEn },
      create: {
        kind: TagKind.LOCATION,
        slug,
        nameBg: names.nameBg,
        nameEn: names.nameEn,
      },
    });
    await prisma.articleTag.createMany({
      data: [{ articleId, tagId: tag.id }],
      skipDuplicates: true,
    });
  }
}
