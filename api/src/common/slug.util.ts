/**
 * Shared slug helpers for articles, authors, series, and future entities.
 */

/** Normalize a human title/name into a URL slug. */
export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё\s-]/giu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'untitled'
  );
}

/** Zero-padded numeric suffix, e.g. "4839201". */
export function randomSlugDigits(length = 7): string {
  const max = 10 ** length;
  const n = Math.floor(Math.random() * max);
  return String(n).padStart(length, '0');
}

export type UniqueSlugOptions = {
  /** Digits appended after a collision (default 7). */
  randomDigits?: number;
  /** Give up after this many random attempts (default 25). */
  maxAttempts?: number;
};

/**
 * Build a unique slug from `source`.
 * Tries the bare slugify first; on collision appends `-{7 random digits}` and retries.
 *
 * @param source - Title / name (or any string to slugify)
 * @param isTaken - Return true if this slug is already used
 */
export async function ensureUniqueSlug(
  source: string,
  isTaken: (slug: string) => Promise<boolean>,
  options: UniqueSlugOptions = {},
): Promise<string> {
  const randomDigits = options.randomDigits ?? 7;
  const maxAttempts = options.maxAttempts ?? 25;
  const base = slugify(source);

  if (!(await isTaken(base))) return base;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = `${base}-${randomSlugDigits(randomDigits)}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  // Extremely unlikely fallback
  return `${base}-${Date.now().toString(36)}`;
}
