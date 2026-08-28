import { ArticleSection, Prisma } from '@prisma/client';
import { slugify } from '../common/slug.util';

export { slugify };

const SECTION_TO_PREFIX: Record<ArticleSection, string> = {
  featured: 'stories',
  human_stories: 'stories',
  places: 'places',
  traditions: 'traditions',
  discover: 'discover',
  voices: 'voices',
  sports: 'sports',
  events: 'events',
  news: 'news',
  video: 'video',
  campaigns: 'campaigns',
  gallery: 'gallery',
};

/** Wire/public section slug (uses hyphen for human-stories). */
export type PublicSection =
  | 'featured'
  | 'human-stories'
  | 'places'
  | 'traditions'
  | 'discover'
  | 'voices'
  | 'sports'
  | 'events'
  | 'news'
  | 'video'
  | 'campaigns'
  | 'gallery';

export function toPrismaSection(section: string): ArticleSection {
  if (section === 'stories') {
    return 'human_stories';
  }
  const normalized = section === 'human-stories' ? 'human_stories' : section;
  if (!(normalized in SECTION_TO_PREFIX)) {
    throw new Error(`Invalid section: ${section}`);
  }
  return normalized as ArticleSection;
}

/** Public list `section=featured` uses the Featured checkbox, not ArticleSection.featured. */
export function isFeaturedFlagQuery(section?: string): boolean {
  return section === 'featured';
}

/** Sections filter for public list/detail (stories maps to both featured + human_stories). */
export function toPrismaSectionFilter(
  section?: string,
): Prisma.EnumArticleSectionFilter | ArticleSection | undefined {
  if (!section) return undefined;
  if (section === 'stories') {
    return { in: ['featured', 'human_stories'] };
  }
  return toPrismaSection(section);
}

export function toPublicSection(section: ArticleSection): PublicSection {
  return section === 'human_stories'
    ? 'human-stories'
    : (section as PublicSection);
}

export function buildArticlePath(section: ArticleSection, slug: string): string {
  return `/${SECTION_TO_PREFIX[section]}/${slug}`;
}
