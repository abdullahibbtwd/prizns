import type { ArticleSection } from '@prisma/client';
import { CATEGORY_SLUG_TO_SECTION } from './category-section';

/**
 * Legacy child slug → main category slug.
 * Kept so WordPress import / flatten can fold old subcategories into the pillar.
 * News (`novini`) and Voices (`tvoyata-duma`) stay as their own roots — they
 * belong to a different public section than their old parent.
 */
export const CATEGORY_PARENT: Record<string, string> = {
  'digitalna-higiena': 'kampanii',
  'istorichesko-nasledstvo': 'nashite-mesta',
  'kulturni-sredishta': 'nashite-mesta',
  otbivki: 'nashite-mesta',
  'prirodno-bogatstvo': 'nashite-mesta',
  'mestni-legendi': 'sport-2',
  predstoyashto: 'sport-2',
  'kauzi-sabitia': 'sabitia',
  'kultura-sabitia': 'sabitia',
  'kulturen-kalendar': 'sabitia',
  'zdrave-ot-prirodata': 'tradicii',
  'obichai-i-poveria': 'tradicii',
  trapeza: 'tradicii',
  'geroi-ot-arhivite-choveshki-istorii': 'choveshki-istorii',
  intervyuta: 'choveshki-istorii',
  'ot-nashte-ora': 'choveshki-istorii',
  portreti: 'choveshki-istorii',
};

export const ROOT_CATEGORY_SLUGS = [
  'kampanii',
  'nashite-mesta',
  'sport-2',
  'sabitia',
  'tradicii',
  'choveshki-istorii',
  'video',
  'discover',
  'novini',
  'tvoyata-duma',
] as const;

/** City leftovers and OPIK — WP used "vratza"; official BG is "vratsa". */
export const DEFAULT_CATEGORY_MERGE: Record<string, string> = {
  vidin: 'nashite-mesta',
  vratza: 'nashite-mesta',
  vratsa: 'nashite-mesta',
  montana: 'nashite-mesta',
  opik: 'kampanii',
  biznes: 'choveshki-istorii',
};

/** WP categories whose stories should show the sponsored badge after merge. */
export const SPONSORED_SOURCE_SLUGS = new Set(['biznes']);

export const HIDDEN_CMS_CATEGORY_SLUGS = new Set(
  Object.keys(DEFAULT_CATEGORY_MERGE),
);

/** Canonical location tag/category slugs (official Bulgarian transliteration). */
export const LOCATION_CATEGORY_SLUGS = ['vidin', 'vratsa', 'montana'] as const;

export type LocationCategorySlug = (typeof LOCATION_CATEGORY_SLUGS)[number];

/** Legacy / alternate spellings → canonical slug. */
export const LOCATION_SLUG_ALIASES: Record<string, LocationCategorySlug> = {
  vidin: 'vidin',
  vratsa: 'vratsa',
  vratza: 'vratsa',
  montana: 'montana',
};

export const LOCATION_CATEGORY_NAMES: Record<
  LocationCategorySlug,
  { nameBg: string; nameEn: string }
> = {
  vidin: { nameBg: 'Видин', nameEn: 'Vidin' },
  vratsa: { nameBg: 'Враца', nameEn: 'Vratsa' },
  montana: { nameBg: 'Монтана', nameEn: 'Montana' },
};

/** Approximate city centres for PLACE tags when Nominatim is unavailable. */
export const LOCATION_KNOWN_COORDS: Record<
  LocationCategorySlug,
  { lat: number; lng: number }
> = {
  vidin: { lat: 43.9967, lng: 22.872 },
  vratsa: { lat: 43.2102, lng: 23.5625 },
  montana: { lat: 43.4125, lng: 23.225 },
};

export const CANONICAL_CATEGORY_SLUGS = new Set<string>([...ROOT_CATEGORY_SLUGS]);

export type CategoryPlacement = {
  categorySlugs: string[];
  locationSlugs: LocationCategorySlug[];
  primarySlug: string | null;
};

export type ResolvePlacementOptions = {
  /** Extra slug→slug replacements; layered on DEFAULT_CATEGORY_MERGE. */
  merge?: Record<string, string>;
  /** Skip city→Our places and OPIK→Campaigns. */
  noDefaultMerge?: boolean;
  /** Also keep Vidin/Vratsa/Montana as extra article categories. */
  alsoLinkCities?: boolean;
};

export function canonicalizeLocationSlug(
  slug: string,
): LocationCategorySlug | null {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  return LOCATION_SLUG_ALIASES[key] ?? null;
}

export function isLocationCategorySlug(slug: string): slug is LocationCategorySlug {
  return canonicalizeLocationSlug(slug) != null;
}

export function shouldMarkSponsored(
  slugs: Array<string | null | undefined>,
): boolean {
  return slugs.some((slug) => Boolean(slug && SPONSORED_SOURCE_SLUGS.has(slug)));
}

export function parseMergeFlag(value: string | undefined): Record<string, string> {
  if (!value?.trim()) return {};
  const out: Record<string, string> = {};
  for (const part of value.split(',')) {
    const [from, to] = part.split(':').map((item) => item.trim());
    if (from && to) out[from] = to;
  }
  return out;
}

function applyMerge(slug: string, merge: Record<string, string>): string {
  const seen = new Set<string>();
  let current = slug;
  while (merge[current] && !seen.has(current)) {
    seen.add(current);
    current = merge[current];
  }
  return current;
}

function scoreSlug(
  slug: string,
  section: ArticleSection | undefined,
  fromCity: Set<string>,
): number {
  const mappedSection = CATEGORY_SLUG_TO_SECTION[slug];
  let score = fromCity.has(slug) ? 0 : 10;
  if (section && mappedSection === section) score += 5;
  return score;
}

/**
 * Collapse WordPress multi-tags onto one main category.
 * Old subcategory slugs fold into their pillar. Cities become location tags.
 */
export function resolveCategoryPlacement(
  slugs: Array<string | null | undefined>,
  section?: ArticleSection,
  opts: ResolvePlacementOptions = {},
): CategoryPlacement {
  const merge = {
    ...CATEGORY_PARENT,
    ...(opts.noDefaultMerge ? {} : DEFAULT_CATEGORY_MERGE),
    ...(opts.merge ?? {}),
  };
  const locationSlugs: LocationCategorySlug[] = [];
  const locationSeen = new Set<LocationCategorySlug>();
  const topicSlugs: string[] = [];
  const topicSeen = new Set<string>();
  const fromCity = new Set<string>();

  for (const raw of slugs) {
    const key = raw?.trim();
    if (!key) continue;
    const locationSlug = canonicalizeLocationSlug(key);
    if (locationSlug && !locationSeen.has(locationSlug)) {
      locationSeen.add(locationSlug);
      locationSlugs.push(locationSlug);
    }
    const mapped = applyMerge(key, merge);
    if (!CANONICAL_CATEGORY_SLUGS.has(mapped) || isLocationCategorySlug(mapped)) {
      continue;
    }
    if (topicSeen.has(mapped)) continue;
    topicSeen.add(mapped);
    topicSlugs.push(mapped);
    if (locationSlug) fromCity.add(mapped);
  }

  const ranked = topicSlugs.slice().sort((a, b) => {
    const diff = scoreSlug(b, section, fromCity) - scoreSlug(a, section, fromCity);
    if (diff !== 0) return diff;
    return topicSlugs.indexOf(a) - topicSlugs.indexOf(b);
  });
  const primarySlug = ranked[0] ?? locationSlugs[0] ?? null;
  const categorySlugs: string[] = [];
  if (primarySlug) categorySlugs.push(primarySlug);
  if (opts.alsoLinkCities) {
    for (const city of locationSlugs) {
      if (!categorySlugs.includes(city)) categorySlugs.push(city);
    }
  }

  return { categorySlugs, locationSlugs, primarySlug };
}
