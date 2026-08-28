import type { PrismaClient } from '@prisma/client';

type SeedCategory = {
  slug: string;
  nameBg: string;
  nameEn: string;
};

const CATEGORIES: SeedCategory[] = [
  { slug: 'kampanii', nameBg: 'Кампании', nameEn: 'Campaigns' },
  { slug: 'nashite-mesta', nameBg: 'Нашите места', nameEn: 'Our places' },
  { slug: 'sport-2', nameBg: 'Спорт', nameEn: 'Sport' },
  { slug: 'sabitia', nameBg: 'Събития', nameEn: 'Events' },
  { slug: 'tradicii', nameBg: 'Традиции', nameEn: 'Traditions' },
  { slug: 'choveshki-istorii', nameBg: 'Човешки истории', nameEn: 'Human stories' },
  { slug: 'video', nameBg: 'Видео', nameEn: 'Video' },
  { slug: 'discover', nameBg: 'Открийте', nameEn: 'Discover' },
  { slug: 'novini', nameBg: 'Новини', nameEn: 'News' },
  { slug: 'tvoyata-duma', nameBg: 'Твоята дума', nameEn: 'Your word' },
];

const PROMOTE_SLUGS = new Set(['novini', 'tvoyata-duma']);

async function flattenSeedTree(prisma: PrismaClient) {
  await prisma.category.updateMany({
    where: { slug: { in: [...PROMOTE_SLUGS] } },
    data: { parentId: null },
  });

  const children = await prisma.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true, parentId: true },
  });

  for (const child of children) {
    const parentId = child.parentId;
    if (!parentId) continue;
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, nameBg: true },
    });
    if (!parent) continue;

    const links = await prisma.articleCategory.findMany({
      where: { categoryId: child.id },
      select: { articleId: true },
    });
    for (const link of links) {
      await prisma.articleCategory.upsert({
        where: {
          articleId_categoryId: {
            articleId: link.articleId,
            categoryId: parent.id,
          },
        },
        create: { articleId: link.articleId, categoryId: parent.id },
        update: {},
      });
      await prisma.article.update({
        where: { id: link.articleId },
        data: { categoryBg: parent.nameBg },
      });
    }
    await prisma.articleCategory.deleteMany({ where: { categoryId: child.id } });
    await prisma.category.delete({ where: { id: child.id } });
  }
}

export async function seedCategories(prisma: PrismaClient) {
  for (const parent of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: parent.slug },
      update: {
        nameBg: parent.nameBg,
        nameEn: parent.nameEn,
        parentId: null,
        translationStatus: 'READY',
        sourceLang: 'bg',
      },
      create: {
        slug: parent.slug,
        nameBg: parent.nameBg,
        nameEn: parent.nameEn,
        translationStatus: 'READY',
        sourceLang: 'bg',
      },
    });
  }

  await flattenSeedTree(prisma);

  console.log(`Seeded ${CATEGORIES.length} categories (no subcategories)`);
}
