import type { PrismaClient } from '@prisma/client';

type SeedCategory = {
  slug: string;
  nameBg: string;
  nameEn: string;
  children?: Array<{ slug: string; nameBg: string; nameEn: string }>;
};

const CATEGORIES: SeedCategory[] = [
  { slug: 'biznes', nameBg: 'Бизнес', nameEn: 'Business' },
  { slug: 'vidin', nameBg: 'Видин', nameEn: 'Vidin' },
  { slug: 'vratza', nameBg: 'Враца', nameEn: 'Vratsa' },
  {
    slug: 'kampanii',
    nameBg: 'Кампании',
    nameEn: 'Campaigns',
    children: [
      {
        slug: 'digitalna-higiena',
        nameBg: 'Дигитална хигиена',
        nameEn: 'Digital hygiene',
      },
    ],
  },
  { slug: 'montana', nameBg: 'Монтана', nameEn: 'Montana' },
  {
    slug: 'nashite-mesta',
    nameBg: 'Нашите места',
    nameEn: 'Our places',
    children: [
      {
        slug: 'istorichesko-nasledstvo',
        nameBg: 'Историческо наследство',
        nameEn: 'Historical heritage',
      },
      {
        slug: 'kulturni-sredishta',
        nameBg: 'Културни средища',
        nameEn: 'Cultural hubs',
      },
      { slug: 'otbivki', nameBg: 'Отбивки', nameEn: 'Detours' },
      {
        slug: 'prirodno-bogatstvo',
        nameBg: 'Природно богатство',
        nameEn: 'Natural wealth',
      },
    ],
  },
  {
    slug: 'sport-2',
    nameBg: 'Спорт',
    nameEn: 'Sport',
    children: [
      {
        slug: 'mestni-legendi',
        nameBg: 'Местни легенди',
        nameEn: 'Local legends',
      },
      { slug: 'novini', nameBg: 'Новини', nameEn: 'News' },
      { slug: 'predstoyashto', nameBg: 'Предстоящо', nameEn: 'Upcoming' },
    ],
  },
  {
    slug: 'sabitia',
    nameBg: 'Събития',
    nameEn: 'Events',
    children: [
      {
        slug: 'kauzi-sabitia',
        nameBg: 'Каузи и инициативи',
        nameEn: 'Causes and initiatives',
      },
      {
        slug: 'kultura-sabitia',
        nameBg: 'Култура и изкуство',
        nameEn: 'Culture and art',
      },
      {
        slug: 'kulturen-kalendar',
        nameBg: 'Културен календар',
        nameEn: 'Cultural calendar',
      },
    ],
  },
  {
    slug: 'tradicii',
    nameBg: 'Традиции',
    nameEn: 'Traditions',
    children: [
      {
        slug: 'zdrave-ot-prirodata',
        nameBg: 'Здраве от природата',
        nameEn: 'Health from nature',
      },
      {
        slug: 'obichai-i-poveria',
        nameBg: 'Обичаи и поверия',
        nameEn: 'Customs and beliefs',
      },
      { slug: 'trapeza', nameBg: 'Трапеза', nameEn: 'The table' },
    ],
  },
  {
    slug: 'choveshki-istorii',
    nameBg: 'Човешки истории',
    nameEn: 'Human stories',
    children: [
      {
        slug: 'geroi-ot-arhivite-choveshki-istorii',
        nameBg: 'Герои от архивите',
        nameEn: 'Heroes from the archives',
      },
      { slug: 'intervyuta', nameBg: 'Интервюта', nameEn: 'Interviews' },
      {
        slug: 'ot-nashte-ora',
        nameBg: 'От наш’те ора',
        nameEn: 'From our people',
      },
      { slug: 'portreti', nameBg: 'Портрети', nameEn: 'Portraits' },
      { slug: 'tvoyata-duma', nameBg: 'Твоята дума', nameEn: 'Your word' },
    ],
  },
  { slug: 'video', nameBg: 'Видео', nameEn: 'Video' },
  { slug: 'opik', nameBg: 'ОПИК', nameEn: 'OPIK' },
];

export async function seedCategories(prisma: PrismaClient) {
  for (const parent of CATEGORIES) {
    const row = await prisma.category.upsert({
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

    for (const child of parent.children ?? []) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          nameBg: child.nameBg,
          nameEn: child.nameEn,
          parentId: row.id,
          translationStatus: 'READY',
          sourceLang: 'bg',
        },
        create: {
          slug: child.slug,
          nameBg: child.nameBg,
          nameEn: child.nameEn,
          parentId: row.id,
          translationStatus: 'READY',
          sourceLang: 'bg',
        },
      });
    }
  }

  const total = CATEGORIES.reduce(
    (n, parent) => n + 1 + (parent.children?.length ?? 0),
    0,
  );
  console.log(`Seeded ${total} categories`);
}
