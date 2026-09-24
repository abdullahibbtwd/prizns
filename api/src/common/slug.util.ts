/**
 * Shared slug helpers for articles, authors, series, and tags.
 *
 * Transliteration follows the official Bulgarian Streamlined System
 * (Ordinance of the Council of Ministers, 2009 / ISO 9 adaptation):
 * ж→zh, ц→ts, ч→ch, ш→sh, щ→sht, ъ→a, ь→(omit), ю→yu, я→ya, й→y, х→h.
 */

const BG_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sht',
  ъ: 'a',
  ь: '',
  ю: 'yu',
  я: 'ya',
  ё: 'yo',
};

const MAX_SLUG_LEN = 80;

/** Official Bulgarian → Latin transliteration (lowercase). */
export function transliterateBg(input: string): string {
  let out = '';
  for (const char of input.normalize('NFC')) {
    const lower = char.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(BG_TO_LATIN, lower)) {
      out += BG_TO_LATIN[lower];
    } else {
      out += char;
    }
  }
  return out;
}

/** Truncate at a hyphen/word boundary — never mid-word. */
export function truncateSlugAtWordBoundary(
  slug: string,
  maxLen = MAX_SLUG_LEN,
): string {
  if (slug.length <= maxLen) return slug;
  const cut = slug.slice(0, maxLen);
  const lastHyphen = cut.lastIndexOf('-');
  if (lastHyphen >= Math.floor(maxLen * 0.45)) {
    return cut.slice(0, lastHyphen).replace(/-+$/g, '');
  }
  return cut.replace(/-+$/g, '');
}

/** Normalize a human title/name into a URL slug (official BG transliteration). */
export function slugify(input: string): string {
  const latin = transliterateBg(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const truncated = truncateSlugAtWordBoundary(latin, MAX_SLUG_LEN);
  return truncated || 'untitled';
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

  return `${base}-${Date.now().toString(36)}`;
}
