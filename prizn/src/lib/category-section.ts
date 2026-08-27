import type { ArticleSection } from '@/lib/cms-types'

/** CMS category slug → public section (matches api/src/categories/category-section.ts). */
export const CATEGORY_SLUG_TO_SECTION: Record<string, ArticleSection> = {
  'mestni-legendi': 'sports',
  predstoyashto: 'sports',
  'sport-2': 'sports',
  novini: 'news',
  portreti: 'human-stories',
  intervyuta: 'human-stories',
  'ot-nashte-ora': 'human-stories',
  'tvoyata-duma': 'voices',
  'geroi-ot-arhivite-choveshki-istorii': 'human-stories',
  'choveshki-istorii': 'human-stories',
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
  biznes: 'human-stories',
}

export type LandingKey =
  | 'stories'
  | 'places'
  | 'traditions'
  | 'events'
  | 'sports'
  | 'campaigns'
  | 'news'
  | 'video'
  | 'discover'

export const LANDING_CATEGORY: Record<
  LandingKey,
  { pillar: string; extra?: string[]; section: ArticleSection | 'stories' }
> = {
  stories: { pillar: 'choveshki-istorii', section: 'stories' },
  places: {
    pillar: 'nashite-mesta',
    section: 'places',
  },
  traditions: { pillar: 'tradicii', section: 'traditions' },
  events: { pillar: 'sabitia', section: 'events' },
  sports: { pillar: 'sport-2', section: 'sports' },
  campaigns: { pillar: 'kampanii', section: 'campaigns' },
  news: { pillar: 'novini', section: 'news' },
  video: { pillar: 'video', section: 'video' },
  discover: { pillar: 'discover', section: 'discover' },
}

export const LANDING_PATH: Record<LandingKey, string> = {
  stories: '/stories',
  places: '/places',
  traditions: '/traditions',
  events: '/events',
  sports: '/sports',
  campaigns: '/campaigns',
  news: '/news',
  video: '/video',
  discover: '/discover',
}

/** City leftovers and OPIK are merged away; hide them in CMS dropdowns. */
export const HIDDEN_CMS_CATEGORY_SLUGS = new Set([
  'vidin',
  'vratza',
  'montana',
  'opik',
  'biznes',
])

export function sectionFromCategorySlugs(
  slugs: Array<string | null | undefined>,
  fallback: ArticleSection = 'human-stories',
): ArticleSection {
  for (const slug of slugs) {
    const key = slug?.trim()
    if (key && CATEGORY_SLUG_TO_SECTION[key]) {
      return CATEGORY_SLUG_TO_SECTION[key]
    }
  }
  return fallback
}
