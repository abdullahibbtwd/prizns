/**
 * WordPress usernames that should not become public author slugs.
 * Keep the old slug in Author.aliases so /authors/{old} still resolves.
 */
export const AUTHOR_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'ami-tola': 'eva-ivanova',
};

export function canonicalAuthorSlug(slug: string): string {
  const trimmed = slug.trim();
  return AUTHOR_SLUG_ALIASES[trimmed] ?? trimmed;
}

/** Former public slugs that now redirect to `canonical`. */
export function previousAuthorSlugs(canonical: string): string[] {
  return Object.entries(AUTHOR_SLUG_ALIASES)
    .filter(([, to]) => to === canonical)
    .map(([from]) => from);
}
