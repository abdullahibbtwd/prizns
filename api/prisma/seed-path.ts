import { ArticleSection } from '@prisma/client';

const SECTION_TO_PREFIX: Record<ArticleSection, string> = {
  featured: 'stories',
  human_stories: 'stories',
  places: 'places',
  traditions: 'traditions',
  discover: 'discover',
  voices: 'voices',
  sports: 'sports',
  events: 'events',
  video: 'video',
  campaigns: 'campaigns',
  gallery: 'gallery',
};

/** Keep seed self-contained (no imports from src/) so Coolify can compile it alone. */
export function buildArticlePath(section: ArticleSection, slug: string): string {
  return `/${SECTION_TO_PREFIX[section]}/${slug}`;
}
