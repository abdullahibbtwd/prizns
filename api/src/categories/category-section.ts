import type { ArticleSection } from '@prisma/client';

/** CMS / WordPress category slug → journal section (child slugs first). */
export const CATEGORY_SLUG_TO_SECTION: Record<string, ArticleSection> = {
  'mestni-legendi': 'sports',
  predstoyashto: 'sports',
  'sport-2': 'sports',
  novini: 'news',
  portreti: 'human_stories',
  intervyuta: 'human_stories',
  'ot-nashte-ora': 'human_stories',
  'tvoyata-duma': 'voices',
  'geroi-ot-arhivite-choveshki-istorii': 'human_stories',
  'choveshki-istorii': 'human_stories',
  'zdrave-ot-prirodata': 'traditions',
  'obichai-i-poveria': 'traditions',
  trapeza: 'traditions',
  tradicii: 'traditions',
  'istorichesko-nasledstvo': 'places',
  'kulturni-sredishta': 'places',
  otbivki: 'places',
  'prirodno-bogatstvo': 'places',
  'nashite-mesta': 'places',
  vidin: 'places',
  vratza: 'places',
  montana: 'places',
  'kauzi-sabitia': 'events',
  'kultura-sabitia': 'events',
  'kulturen-kalendar': 'events',
  sabitia: 'events',
  'digitalna-higiena': 'campaigns',
  kampanii: 'campaigns',
  opik: 'campaigns',
  video: 'video',
  discover: 'discover',
  biznes: 'human_stories',
};

export function sectionFromCategorySlugs(
  slugs: Array<string | null | undefined>,
  fallback: ArticleSection = 'human_stories',
): ArticleSection {
  for (const slug of slugs) {
    const key = slug?.trim();
    if (key && CATEGORY_SLUG_TO_SECTION[key]) {
      return CATEGORY_SLUG_TO_SECTION[key];
    }
  }
  return fallback;
}
